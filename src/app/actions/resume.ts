"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

import { cookies } from "next/headers"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

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
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: "GEMINI_API_KEY is not configured in .env.local" }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const isDemo = cookieStore.get("mockmate-demo-session")?.value === "true"

    if (!user && !isDemo) {
      return { success: false, error: "Not authenticated" }
    }


    // Call Gemini to analyze the resume
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    })

    const prompt = `You are an expert resume reviewer and career coach.
Analyze the following resume text and generate a structured JSON analysis report.

Resume Content:
"""
${resumeText}
"""

You MUST respond with a single valid JSON object containing exactly the following keys:
{
  "summary": "<a concise 2-3 sentence overview of their professional background, career level, and primary focus areas>",
  "skills": ["<skill 1>", "<skill 2>", "<skill 3>", "... (extract up to 10 key technical and soft skills)"],
  "highlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>", "... (extract 2-3 key accomplishments or experience bullet points)"],
  "interviewTopics": ["<topic 1>", "<topic 2>", "<topic 3>", "... (recommend 3-4 specific topics they should practice in mock interviews)"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>", "... (provide 2-3 actionable suggestions to improve their resume details/structure)"]
}

Ensure the output is clean JSON. Do not include markdown wraps like \`\`\`json. Return only the raw JSON string.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const analysis: ResumeAnalysis = JSON.parse(text)

    // Save to Supabase users table if authenticated user exists
    if (user) {
      const { error } = await supabase
        .from("users")
        .update({
          resume_text: resumeText,
          resume_analysis: analysis,
        })
        .eq("id", user.id)

      if (error) {
        console.error("Error saving resume to Supabase:", error)
        return { success: false, error: error.message }
      }
    }

    return {
      success: true,
      data: {
        resumeText,
        analysis,
      },
    }
  } catch (err) {
    console.error("saveAndAnalyzeResume failed:", err)
    return { success: false, error: "An unexpected error occurred during resume analysis." }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const cookieStore = await cookies()
    const isDemo = cookieStore.get("mockmate-demo-session")?.value === "true"

    if (!user && !isDemo) {
      return { success: false, error: "Not authenticated" }
    }

    if (!user) {
      return {
        success: true,
        data: {
          resumeText: "",
          analysis: null,
        },
      }
    }

    const { data, error } = await supabase
      .from("users")
      .select("resume_text, resume_analysis")
      .eq("id", user.id)
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

