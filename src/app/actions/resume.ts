"use server"

import { createClient } from "@/lib/supabase/server"
import { getUserTier } from "@/lib/entitlements"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { callAI } from "@/lib/aiRouter"
import { isRateLimited } from "@/lib/rateLimit"

/**
 * Longest resume we will send to a model. A real CV is a few thousand
 * characters; the cap exists because this action is a public endpoint that
 * takes a raw string, so an unbounded one is a direct cost attack.
 */
const MAX_RESUME_CHARS = 50_000

export interface ResumeAnalysis {
  summary: string
  skills: string[]
  highlights: string[]
  interviewTopics: string[]
  improvements: string[]
}

/**
 * Saves resume text to the database and runs Gemini AI analysis on it.
 */
export async function saveAndAnalyzeResume(
  resumeText: string
): Promise<{ success: boolean; data?: { resumeText: string; analysis: ResumeAnalysis }; error?: string }> {
  try {
    const user = await getCurrentUser()
    const isDemoMode = user.isDemo
    const userId = user.userId

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }
    if (typeof resumeText !== "string" || !resumeText.trim()) {
      return { success: false, error: "Please provide the text of your resume." }
    }
    if (resumeText.length > MAX_RESUME_CHARS) {
      return {
        success: false,
        error: "That resume is too long to analyse. Please trim it to a couple of pages and try again.",
      }
    }
    if (await isRateLimited(`resume-analysis:${userId}`)) {
      return { success: false, error: "You've analysed several resumes today. Please try again tomorrow." }
    }

    if (isDemoMode) {
      // Demo sessions are DEMO_TIER, never "premium". The demo cookie is
      // unsigned, so handing it the top model made free unlimited LLM spend a
      // matter of setting a cookie.
      const { tier: demoTier } = await getUserTier()
      const responseJsonText = await callAI(
        resumeText,
        "analyze_resume",
        demoTier
      )
      const analysis = JSON.parse(responseJsonText) as ResumeAnalysis
      
      // Safely persist demo resume metadata without exceeding 4KB cookie header limits
      try {
        const cookieStore = await cookies()
        const payload = JSON.stringify({ resumeText: resumeText.substring(0, 1000), analysis });
        if (payload.length < 3500) {
          cookieStore.set("mockmate-demo-resume", payload, { path: "/", maxAge: 604800 });
        }
      } catch (e) {
        console.warn("[resume] Demo resume cookie payload skipped due to size limits:", e);
      }

      return {
        success: true,
        data: {
          resumeText,
          analysis,
        },
      }
    }

    const supabase = await createClient()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const { tier: userTier } = await getUserTier()

    const responseJsonText = await callAI(
      resumeText,
      "analyze_resume",
      userTier
    )
    const analysis = JSON.parse(responseJsonText) as ResumeAnalysis

    // Save to Supabase users table
    const { error } = await supabase
      .from("users")
      .upsert({
        id: userId,
        resume_text: resumeText,
        resume_analysis: analysis,
      })

    if (error) {
      console.error("Error saving resume to Supabase:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/dashboard/resume")

    return {
      success: true,
      data: {
        resumeText,
        analysis,
      },
    }
  } catch (err) {
    console.error("saveAndAnalyzeResume failed:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred during resume analysis.",
    }
  }
}

/**
 * Retrieves the saved resume and its analysis from the database.
 */
export async function getResumeData(): Promise<{
  success: boolean
  data?: { resumeText: string; analysis: ResumeAnalysis | null }
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    const isDemoMode = user.isDemo
    const userId = user.userId

    if (isDemoMode) {
      const cookieStore = await cookies()
      const customResume = cookieStore.get("mockmate-demo-resume")?.value
      if (customResume) {
        try {
          const parsed = JSON.parse(customResume)
          return {
            success: true,
            data: {
              resumeText: parsed.resumeText,
              analysis: parsed.analysis
            }
          }
        } catch {}
      }

      return {
        success: true,
        data: undefined
      }
    }

    const supabase = await createClient()

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    const { data, error } = await supabase
      .from("users")
      .select("resume_text, resume_analysis")
      .eq("id", userId)
      .single()

    if (error) {
      // Handle missing profile row or empty columns
      if (error.code === "PGRST116") {
        return {
          success: true,
          data: {
            resumeText: "",
            analysis: null,
          },
        }
      }
      console.error("Error fetching resume from Supabase:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        resumeText: data?.resume_text || "",
        analysis: data?.resume_analysis || null,
      },
    }
  } catch (err) {
    console.error("getResumeData failed:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

