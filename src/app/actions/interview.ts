"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface MessageInput {
  role: "user" | "ai"
  content: string
}

/**
 * Generates the next question or response from the AI interviewer.
 */
export async function getNextQuestion(
  category: string,
  previousMessages: MessageInput[]
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "Error: GEMINI_API_KEY is not configured in .env.local"
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const historyPrompt = previousMessages
      .map((msg) => `${msg.role === "ai" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are an expert AI Interviewer conducting a mock interview for the category: "${category}".
Your goal is to conduct a professional, realistic, and interactive conversation.
Assess the candidate's answers, ask relevant follow-up questions, or transition to a new topic as appropriate.

Rules:
1. Keep your responses concise, natural, and conversational (1-3 sentences maximum).
2. Do not use any markdown formatting, prefixing, headers, or bullet points (e.g. do not write "Question: ..."). Just output the raw conversational text.
3. If this is the start of the interview (no candidate answers yet), ask a friendly introductory question tailored to the "${category}" category.
4. If the candidate has already answered 4 or 5 questions, politely wrap up the interview and state that you will now analyze the transcript to prepare their performance feedback.

Conversation History so far:
${historyPrompt}

Next Response:`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error("Gemini API Error in getNextQuestion:", error)
    return "I'm sorry, I encountered an issue generating the next question. Please try replying again."
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
  }

  if (!process.env.GEMINI_API_KEY) {
    return fallbackFeedback
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
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
  "breakdown": [
    { "label": "Communication", "score": <number> },
    { "label": "Technical Knowledge", "score": <number> },
    { "label": "Problem Solving", "score": <number> },
    { "label": "Confidence", "score": <number> }
  ]
}

Ensure all scores are numbers, and no extra text or markdown formatting (e.g. no \`\`\`json blocks) is returned. Just the raw JSON object.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const data = JSON.parse(text)

    // Map color classes to the breakdown scores for UI rendering
    const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-green-500"]
    const breakdown = (data.breakdown || []).map((item: any, idx: number) => ({
      label: item.label || "Criteria",
      score: typeof item.score === "number" ? item.score : 70,
      color: colors[idx % colors.length],
    }))

    return {
      score: typeof data.score === "number" ? data.score : 75,
      summary: data.summary || "Good effort on your mock interview.",
      strengths: Array.isArray(data.strengths) ? data.strengths : ["Clear communication"],
      improvements: Array.isArray(data.improvements) ? data.improvements : ["Add details to answers"],
      breakdown,
    }
  } catch (error) {
    console.error("Gemini API Error in generateFeedback:", error)
    return fallbackFeedback
  }
}

/**
 * Save interview session to database if user is authenticated.
 */
export async function createInterviewSession(category: string): Promise<string | null> {
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
