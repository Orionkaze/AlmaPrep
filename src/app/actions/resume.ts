"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getLLMJSONResponse } from "@/lib/llm"
import { callAI } from "@/lib/aiRouter"

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const isDemo = cookieStore.get("mockmate-demo-session")?.value === "true"

    if (!user && !isDemo) {
      return { success: false, error: "Not authenticated" }
    }


    let userTier = "free"
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single()
      if (profile && profile.subscription_tier) {
        userTier = profile.subscription_tier
      }
    }

    const responseJsonText = await callAI(
      resumeText,
      "analyze_resume",
      userTier
    )
    const analysis = JSON.parse(responseJsonText) as ResumeAnalysis

    // Save to Supabase users table if authenticated user exists
    if (user) {
      const { error } = await supabase
        .from("users")
        .upsert({
          id: user.id,
          resume_text: resumeText,
          resume_analysis: analysis,
        })

      if (error) {
        console.error("Error saving resume to Supabase:", error)
        return { success: false, error: error.message }
      }

      revalidatePath("/dashboard/resume")
    }

    return {
      success: true,
      data: {
        resumeText,
        analysis,
      },
    }
  } catch (err: any) {
    console.error("saveAndAnalyzeResume failed:", err)
    return { success: false, error: err.message || "An unexpected error occurred during resume analysis." }
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
    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = session?.user?.id || supabaseUser?.id

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

