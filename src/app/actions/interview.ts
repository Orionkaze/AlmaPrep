"use server"

import { createClient } from "@/lib/supabase/server"
import { getLLMResponse, getLLMJSONResponse } from "@/lib/llm"
import { callAI, callAIWithSource } from "@/lib/aiRouter"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import { getResumeData } from "@/app/actions/resume"
import { getCombinedDomainQuestions } from "@/lib/programs"

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
): Promise<{ question: string; source: string }> {
  try {
    let resumeText = ""
    if (useResume) {
      try {
        const res = await getResumeData()
        if (res.success && res.data?.resumeText) {
          resumeText = res.data.resumeText
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

    const systemPrompt = `You are an expert AI Interviewer conducting a mock interview for the category: "${category}".
${personaPrompt}
Your goal is to conduct a realistic and interactive conversation in this exact persona.
Assess the candidate's answers, ask relevant follow-up questions, or transition to a new topic as appropriate.
${resumeContextPrompt}

Rules:
1. Keep your responses concise, natural, and conversational (1-3 sentences maximum). Stay deeply in your persona.
2. Do not use any markdown formatting, prefixing, headers, or bullet points (e.g. do not write "Question: ..."). Just output the raw conversational text.
3. If this is the start of the interview (no candidate answers yet), ask a relevant introductory question tailored to the "${category}" category.
4. If the candidate has already answered 9 or 10 questions, politely wrap up the interview (in your persona). Make sure to include a concluding salutation (e.g., "It was nice speaking with you. I will now analyze our conversation to prepare your feedback.") and do NOT ask any further questions.`

    const formattedMessages = previousMessages.map((msg) => ({
      role: msg.role === "ai" ? "assistant" as const : "user" as const,
      content: msg.content,
    }))

    if (formattedMessages.length === 0) {
      formattedMessages.push({ role: "user", content: "Hello, please introduce yourself and ask the first question." })
    }

    let userTier = "free"
    try {
      const cookieStore = await cookies()
      const hasDemoCookie = cookieStore.has("mockmate-demo-session")
      if (hasDemoCookie) {
        userTier = "premium"
      } else {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
      }
    } catch (err) {
      console.error("Failed to fetch user tier in getNextQuestion:", err)
    }

    try {
      const nextResponse = await callAIWithSource(
        JSON.stringify({ category, previousMessages, useResume, persona }),
        "next_question",
        userTier
      )
      return { question: nextResponse.result, source: nextResponse.source }
    } catch (err: any) {
      if (err.message && err.message.includes("free interviews")) {
        return {
          question: `[Limit Reached] You've used all 3 free interviews this month. Upgrade to Pro for unlimited access.`,
          source: "system"
        }
      }
      console.warn("All LLM providers failed, using vetted fallback...", err)
      
      // Fallback Layer: Fetch combined program & universal questions
      const questions = getCombinedDomainQuestions(category)
      
      // Filter out questions already asked in previous history
      const askedQuestionsText = new Set(
        previousMessages
          .filter(m => m.role === "ai")
          .map(m => m.content.toLowerCase().trim())
      )
      
      const availableQuestions = questions.filter(q => {
        const qTextNormal = q.question.toLowerCase().trim()
        return !askedQuestionsText.has(qTextNormal)
      })
      
      let selectedQuestion = ""
      if (availableQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length)
        selectedQuestion = availableQuestions[randomIndex].question
      } else {
        const fallbacks = [
          "That is an interesting point. Could you elaborate a little more on the specific challenges you faced there?",
          "Can you walk me through your decision-making process for the technologies you selected in your project?",
          "How did you handle teamwork or communication conflicts if they arose during your work?",
          "Let's transition slightly: what area of this role interests you the most and why?",
          "Could you describe a time when you had to learn a new tool or framework quickly to solve a problem?"
        ]
        const index = previousMessages.length % fallbacks.length
        selectedQuestion = fallbacks[index]
      }
      
      return { question: selectedQuestion, source: "vetted_fallback" }
    }
  } catch (error: any) {
    console.error("Error in getNextQuestion Server Action:", error)
    return {
      question: `[System Error: ${error?.message || "Unknown"}] I'm sorry, I encountered an issue generating the next question. Please try replying again.`,
      source: "error"
    }
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
  questionEvaluation?: { question: string; userAnswer: string; score: number; feedback: string; modelAnswer: string }[]
  breakdown: { label: string; score: number; color: string }[]
}> {
  const fallbackFeedback = {
    score: 75,
    summary: "Thank you for completing the interview. Here is an analysis of your performance generated by Mock AI.",
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
    ],
    questionEvaluation: []
  }

  try {
    const transcript = messages
      .map((msg) => `${msg.role === "ai" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n")

    const systemPrompt = `You are an expert interviewer evaluating a candidate's performance in a mock interview for the category: "${category}".`
    const prompt = `Analyze the following transcript of the mock interview:
${transcript}

Evaluate the candidate's answers based on communication, technical depth, structured delivery, and confidence.
Respond ONLY with a valid JSON object matching this exact structure:
{
  "score": <number between 0 and 100>,
  "summary": "<a concise 2-3 sentence overview of their performance, strengths, and areas to work on>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement suggestion 1>", "<improvement suggestion 2>", "<improvement suggestion 3>", "<improvement suggestion 4>"],
  "questionEvaluation": [
    {
      "question": "<the exact question asked from the question bank (or standard track)>",
      "userAnswer": "<brief summary of candidate's answer>",
      "score": <score for this answer, number between 0 and 100>,
      "feedback": "<constructive feedback for this answer comparing it to what we look for>",
      "modelAnswer": "<the ideal answer or model answer from the question bank (or standard track)>"
    }
  ],
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

Ensure all scores are numbers, and no extra text or markdown formatting is returned. Just the raw JSON object.`

    interface FeedbackJson {
      score: number
      summary: string
      strengths: string[]
      improvements: string[]
      studyGuide?: { topic: string; advice: string }[]
      questionEvaluation?: { question: string; userAnswer: string; score: number; feedback: string; modelAnswer: string }[]
      breakdown: { label: string; score: number }[]
    }

    let userTier = "free"
    try {
      const cookieStore = await cookies()
      const hasDemoCookie = cookieStore.has("mockmate-demo-session")
      if (hasDemoCookie) {
        userTier = "premium"
      } else {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
      }
    } catch (err) {
      console.error("Failed to fetch user tier in generateFeedback:", err)
    }

    const responseJsonText = await callAI(
      JSON.stringify({ category, messages }),
      "generate_feedback",
      userTier
    )
    const data = JSON.parse(responseJsonText) as FeedbackJson

    // Map color classes to the breakdown scores for UI rendering
    const colors = ["bg-primary", "bg-secondary", "bg-accent", "bg-green-500"]
    const breakdown = (data.breakdown || []).map((item, idx: number) => ({
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
      questionEvaluation: Array.isArray(data.questionEvaluation) ? data.questionEvaluation : [],
      breakdown,
    }
  } catch (error: any) {
    console.error("LLM Error in generateFeedback:", error)
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
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return null
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

    if (!userId) return null

    const { data, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
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
  content: string,
  source?: string
): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return false
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

    if (!userId) return false

    const metadata = source ? { source } : {}

    const { error } = await supabase.from("messages").insert({
      interview_id: interviewId,
      role,
      content,
      metadata,
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
  improvements: string[],
  strengths?: string[],
  studyGuide?: { topic: string; advice: string }[],
  questionEvaluation?: { question: string; userAnswer: string; score: number; feedback: string; modelAnswer: string }[]
): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return false
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

    if (!userId) return false

    // Serialize strengths, studyGuide, and questionEvaluation inside summary since table lacks dedicated columns
    const serializedSummary = JSON.stringify({
      summary,
      strengths: strengths || ["Clear Communication", "Structured Delivery"],
      studyGuide: studyGuide || [],
      questionEvaluation: questionEvaluation || []
    })

    const { error } = await supabase.from("feedback").insert({
      interview_id: interviewId,
      score,
      summary: serializedSummary,
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
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return null
    }

    const session = await getServerSession(authOptions)
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    const userId = (session?.user as any)?.id || supabaseUser?.id

    if (!userId) return null

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("interview_id", interviewId)
      .single()

    if (error) {
      console.error("Error fetching feedback from Supabase:", error)
      return null
    }

    let summaryText = data.summary || ""
    let strengthsData = ["Clear Communication", "Structured Delivery"]
    let studyGuideData: { topic: string; advice: string }[] = []
    let questionEvaluationData: { question: string; userAnswer: string; score: number; feedback: string; modelAnswer: string }[] = []

    try {
      if (summaryText.startsWith("{")) {
        const parsed = JSON.parse(summaryText)
        summaryText = parsed.summary || ""
        strengthsData = parsed.strengths || strengthsData
        studyGuideData = parsed.studyGuide || []
        questionEvaluationData = parsed.questionEvaluation || []
      }
    } catch (e) {
      console.warn("Failed to parse serialized summary JSON:", e)
    }

    return {
      score: data.score,
      summary: summaryText,
      strengths: strengthsData,
      improvements: data.improvement_suggestions || [],
      studyGuide: studyGuideData,
      questionEvaluation: questionEvaluationData,
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
