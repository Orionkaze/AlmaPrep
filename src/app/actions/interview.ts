"use server"

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
]

interface MessageInput {
  role: "user" | "ai"
  content: string
}

/**
 * Generates the next question or response from the AI interviewer.
 */
export async function getNextQuestion(
  category: string,
  previousMessages: MessageInput[],
  useResume?: boolean,
  persona?: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "Error: GEMINI_API_KEY is not configured in .env.local"
  }

  try {
    let model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      safetySettings 
    })

    let resumeText = ""
    if (useResume) {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from("users")
            .select("resume_text")
            .eq("id", user.id)
            .single()
          if (data && data.resume_text) {
            resumeText = data.resume_text
          }
        }
      } catch (err) {
        console.error("Failed to fetch resume text in getNextQuestion:", err)
      }
    }

    const resumeContextPrompt = resumeText 
      ? `The candidate has provided their resume for customization:
---
${resumeText}
---
Focus your interview questions on their background, experiences, projects, and technologies listed in the resume, while still aligning with the "${category}" interview category.`
      : ""

    let personaPrompt = "You are a professional, encouraging, and standard recruiter."
    if (persona === "roast") {
      personaPrompt = "You are in ROAST MODE 💀. You are brutally honest, highly sarcastic, funny, and hyper-critical. Roast the candidate's answers while asking your follow-up questions. Be mean but entertaining."
    } else if (persona === "strict") {
      personaPrompt = "You are an extremely strict, cold, and formal interviewer. You have extremely high standards, you do not show emotion, and you ask intense follow-up questions to test the candidate's true depth of knowledge."
    } else if (persona === "supportive") {
      personaPrompt = "You are a very supportive, warm, and friendly interviewer. You want the candidate to succeed, so you offer gentle encouragement before asking the next question."
    }

    const historyPrompt = previousMessages
      .map((msg) => `${msg.role === "ai" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are an expert AI Interviewer conducting a mock interview for the category: "${category}".
${personaPrompt}
Your goal is to conduct a realistic and interactive conversation in this exact persona.
Assess the candidate's answers, ask relevant follow-up questions, or transition to a new topic as appropriate.
${resumeContextPrompt}

Rules:
1. Keep your responses concise, natural, and conversational (1-3 sentences maximum). Stay deeply in your persona.
2. Do not use any markdown formatting, prefixing, headers, or bullet points (e.g. do not write "Question: ..."). Just output the raw conversational text.
3. If this is the start of the interview (no candidate answers yet), ask a relevant introductory question tailored to the "${category}" category.
4. If the candidate has already answered 9 or 10 questions, politely wrap up the interview (in your persona). Make sure to include a concluding salutation (e.g., "It was nice speaking with you. I will now analyze our conversation to prepare your feedback.") and do NOT ask any further questions.

Conversation History so far:
${historyPrompt}

Next Response:`



    let result;
    try {
      result = await model.generateContent(prompt)
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("Quota")) {
        console.log("Quota exceeded. Using mock conversational fallback...")
        return "That is an interesting point. Could you elaborate a little more on the specific challenges you faced there?"
      } else {
        throw err;
      }
    }
    
    return result.response.text().trim()
  } catch (error: any) {
    console.error("Gemini API Error in getNextQuestion:", error)
    return `[System Error: ${error?.message || "Unknown"}] I'm sorry, I encountered an issue generating the next question. Please try replying again.`
  }
}

/**
 * Analyzes the completed interview transcript and generates a detailed feedback report.
 */
export async function generateFeedback(
  category: string,
  messages: MessageInput[]
): Promise<{
  score: number
  summary: string
  strengths: string[]
  improvements: string[]
  studyGuide?: { topic: string; advice: string }[]
  breakdown: { label: string; score: number; color: string }[]
}> {
  const fallbackFeedback = {
    score: 75,
    summary: "Thank you for completing the interview. Here is a simulated analysis of your answers. Set up a valid Gemini API Key to receive personalized feedback.",
    strengths: ["Completed the interview session", "Structured responses"],
    improvements: ["Incorporate specific examples using the STAR method", "Provide deeper technical details"],
    breakdown: [
      { label: "Communication", score: 80, color: "bg-primary" },
      { label: "Technical Knowledge", score: 70, color: "bg-secondary" },
      { label: "Problem Solving", score: 75, color: "bg-accent" },
      { label: "Confidence", score: 78, color: "bg-green-500" },
    ],
    studyGuide: [
      {
        topic: "STAR Method",
        advice: "Practice formatting your answers using Situation, Task, Action, Result to ensure your responses are comprehensive."
      },
      {
        topic: "Technical Depth",
        advice: "When explaining technical concepts, try to go one level deeper into the architecture or trade-offs involved."
      }
    ]
  }

  if (!process.env.GEMINI_API_KEY) {
    return fallbackFeedback
  }

  try {
    let model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings,
      generationConfig: { responseMimeType: "application/json" },
    })

    const transcript = messages
      .map((msg) => `${msg.role === "ai" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are an expert interviewer evaluating a candidate's performance in a mock interview for the category: "${category}".
Analyze the following transcript of the mock interview:
${transcript}

Evaluate the candidate's answers based on communication, technical depth, structured delivery, and confidence.
Respond ONLY with a valid JSON object matching this exact structure:
{
  "score": <number between 0 and 100>,
  "summary": "<a concise 2-3 sentence overview of their performance, strengths, and areas to work on>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>", "<improvement suggestion 3>", "<improvement suggestion 4>"],
  "studyGuide": [
    { "topic": "<specific topic to study>", "advice": "<actionable advice>" },
    { "topic": "<specific topic to study>", "advice": "<actionable advice>" }
  ],
  "breakdown": [
    { "label": "Communication", "score": <number> },
    { "label": "Technical Knowledge", "score": <number> },
    { "label": "Problem Solving", "score": <number> },
    { "label": "Confidence", "score": <number> }
  ]
}

Ensure all scores are numbers, and no extra text or markdown formatting (e.g. no \`\`\`json blocks) is returned. Just the raw JSON object.`

    let result;
    try {
      result = await model.generateContent(prompt)
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("Quota")) {
        console.log("Quota exceeded. Returning fallback mock feedback...")
        return fallbackFeedback
      } else {
        throw err;
      }
    }

    const text = result.response.text().trim()
    const data = JSON.parse(text)

    // Map color classes to the breakdown scores for UI rendering
    const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-green-500"]
    const breakdown = (data.breakdown || []).map((item: { label?: string; score?: number }, idx: number) => ({
      label: item.label || "Criteria",
      score: typeof item.score === "number" ? item.score : 70,
      color: colors[idx % colors.length],
    }))

    return {
      score: typeof data.score === "number" ? data.score : 75,
      summary: data.summary || "Good effort on your mock interview.",
      strengths: Array.isArray(data.strengths) ? data.strengths : ["Clear communication"],
      improvements: Array.isArray(data.improvements) ? data.improvements : ["Add details to answers"],
      studyGuide: Array.isArray(data.studyGuide) ? data.studyGuide : fallbackFeedback.studyGuide,
      breakdown,
    }
  } catch (error: any) {
    console.error("Gemini API Error in generateFeedback:", error)
    return {
      ...fallbackFeedback,
      summary: `[System Error generating actual feedback: ${error?.message || "Unknown"}]. Here is a simulated analysis instead.`
    }
  }
}

/**
 * Save interview session to database if user is authenticated.
 */
export async function createInterviewSession(category: string, useResume?: boolean): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from("interviews")
      .insert({
        user_id: user.id,
        category,
        status: "in_progress",
        use_resume: useResume || false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating interview in Supabase:", error)
      return null
    }

    return data.id
  } catch (e) {
    console.error("Supabase createInterviewSession failed:", e)
    return null
  }
}

/**
 * Save messages to Supabase if authenticated.
 */
export async function saveInterviewMessage(
  interviewId: string,
  role: "user" | "ai",
  content: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { error } = await supabase.from("messages").insert({
      interview_id: interviewId,
      role,
      content,
    })

    if (error) {
      console.error("Error saving message in Supabase:", error)
      return false
    }
    return true
  } catch (e) {
    console.error("Supabase saveInterviewMessage failed:", e)
    return false
  }
}

/**
 * Save feedback report to Supabase if authenticated.
 */
export async function saveInterviewFeedback(
  interviewId: string,
  score: number,
  summary: string,
  improvements: string[]
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { error } = await supabase.from("feedback").insert({
      interview_id: interviewId,
      score,
      summary,
      improvement_suggestions: improvements,
    })

    // Also update interview status to completed
    await supabase
      .from("interviews")
      .update({ status: "completed" })
      .eq("id", interviewId)

    if (error) {
      console.error("Error saving feedback in Supabase:", error)
      return false
    }
    return true
  } catch (e) {
    console.error("Supabase saveInterviewFeedback failed:", e)
    return false
  }
}

/**
 * Fetch saved feedback from Supabase for a given interview ID.
 */
export async function getFeedback(interviewId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("interview_id", interviewId)
      .single()

    if (error) {
      console.error("Error fetching feedback from Supabase:", error)
      return null
    }

    return {
      score: data.score,
      summary: data.summary,
      strengths: ["Clear Communication", "Structured Delivery"],
      improvements: data.improvement_suggestions || [],
      breakdown: [
        { label: "Communication", score: data.score, color: "bg-primary" },
        { label: "Technical Knowledge", score: Math.max(50, data.score - 5), color: "bg-secondary" },
        { label: "Problem Solving", score: Math.max(50, data.score - 3), color: "bg-accent" },
        { label: "Confidence", score: Math.min(100, data.score + 2), color: "bg-green-500" },
      ]
    }
  } catch (e) {
    console.error("Supabase getFeedback failed:", e)
    return null
  }
}
