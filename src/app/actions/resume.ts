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
    const cookieStore = await cookies()
    const hasDemoCookie = cookieStore.has("mockmate-demo-session")
    if (hasDemoCookie) {
      const responseJsonText = await callAI(
        resumeText,
        "analyze_resume",
        "premium"
      )
      const analysis = JSON.parse(responseJsonText) as ResumeAnalysis
      return {
        success: true,
        data: {
          resumeText,
          analysis,
        },
      }
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }

    let userTier = "free"
    const { data: profile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", userId)
      .single()
    if (profile && profile.subscription_tier) {
      userTier = profile.subscription_tier
    }

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
    const cookieStore = await cookies()
    const hasDemoCookie = cookieStore.has("mockmate-demo-session")
    if (hasDemoCookie) {
      return {
        success: true,
        data: {
          resumeText: "Straw Hat Luffy\nCaptain of the Straw Hat Pirates\n\nEXPERIENCE:\nCaptain - Straw Hat Pirates (2020 - Present)\n- Guided crew across the Grand Line, entering the New World.\n- Defeated numerous Warlords, Emperor Kaido, and Emperor Big Mom to maintain freedom and safety for friendly territories.\n\nSKILLS:\n- Conqueror's Haki, Armament Haki, Observation Haki\n- Gear 5 (Nika rubber body transformations)\n- Strong leadership and resilience\n- Meat consumption analysis",
          analysis: {
            summary: "Extremely driven and resilient team captain with extensive experience leading diverse teams in high-risk environments. Primary focus is territory management, combat, and achieving ultimate goals (the One Piece).",
            skills: ["Leadership", "Conqueror's Haki", "Observation Haki", "Rubber Body Elasticity (Gear 5)", "Risk Assessment", "Conflict Management", "Physical Resilience"],
            highlights: ["Liberated multiple nations (Wano, Alabasta, Dressrosa)", "Earned the title of Emperor of the Sea with a 3 billion bounty", "Successfully recruited 9 highly specialized crew members"],
            interviewTopics: ["Crisis management and split-team coordination", "Dealing with massive power disparities (e.g. Admirals)", "Ethical decision making under severe pressure"],
            improvements: ["Add detailed metrics of territories protected", "Limit informal slang (e.g. calling superiors 'meathead') in professional settings"]
          }
        }
      }
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

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

