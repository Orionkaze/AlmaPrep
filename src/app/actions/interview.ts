"use server"

import { createClient } from "@/lib/supabase/server"
import { getLLMResponse, getLLMJSONResponse, callGroqJson, callGroqText, cleanJsonResponseText } from "@/lib/llm"
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
  persona?: string,
  mode?: string,
  selectedRepos?: string[]
): Promise<{ question: string; source: string; repo_name?: string }> {
  try {
    const isGithub = mode === "github" && selectedRepos && selectedRepos.length >= 2
    const aiQuestions = previousMessages.filter(m => m.role === "ai")
    const questionIndex = aiQuestions.length

    const interleaving = ["general", "github_repo", "github_repo", "general", "github_repo", "github_repo", "general", "github_repo", "github_repo", "general"]
    const currentSlot = isGithub && questionIndex < 10 ? interleaving[questionIndex] : "general"

    // If it's a repo-specific question slot, handle pulling from Supabase or dynamic follow-up
    if (isGithub && currentSlot === "github_repo") {
      let repoIdx = 0
      if (questionIndex === 1 || questionIndex === 2) repoIdx = 0
      else if (questionIndex === 4 || questionIndex === 5) repoIdx = 1
      else if (questionIndex === 7 || questionIndex === 8) repoIdx = 2 % selectedRepos.length

      const currentRepoName = selectedRepos[repoIdx]

      // Slot type: Initial repo question (easy/medium/hard) vs Follow-up
      const isInitialRepoSlot = questionIndex === 1 || questionIndex === 4 || questionIndex === 7

      if (isInitialRepoSlot) {
        try {
          const supabase = await createClient()
          const { data: analysis } = await supabase
            .from("github_analysis")
            .select("questions")
            .maybeSingle()

          if (analysis && Array.isArray(analysis.questions)) {
            const difficulty = questionIndex === 1 ? "easy" : questionIndex === 4 ? "medium" : "hard"
            const match = analysis.questions.find(
              (q: any) => q.repo === currentRepoName && q.difficulty === difficulty
            )
            const fallbackMatch = analysis.questions.find((q: any) => q.repo === currentRepoName)
            const targetQuestion = match?.question || fallbackMatch?.question

            if (targetQuestion) {
              return {
                question: `Looking at your project ${currentRepoName} — ${targetQuestion}`,
                source: "github_repo",
                repo_name: currentRepoName
              }
            }
          }
        } catch (dbErr) {
          console.error("Failed to query pre-generated questions in getNextQuestion:", dbErr)
        }
      }

      // If it's a follow-up slot, or fallback for initial slot query failure: generate dynamically via Groq
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
          JSON.stringify({ 
            category, 
            previousMessages, 
            useResume, 
            persona,
            mode: "github",
            selectedRepos,
            currentRepoName
          }),
          "next_question",
          userTier
        )
        return { 
          question: nextResponse.result, 
          source: "github_repo", 
          repo_name: currentRepoName 
        }
      } catch (err: any) {
        console.error("AI routing failed for github follow-up, falling back to general", err)
      }
    }

    // Default: General track question generation (Optionally customized with Resume)
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
export async function createInterviewSession(
  category: string,
  useResume?: boolean,
  mode?: string,
  selectedRepos?: string[]
): Promise<string | null> {
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
        mode: mode || "general",
        selected_repos: selectedRepos || [],
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
  source?: string,
  repoName?: string
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

    const metadata = {
      ...(source ? { source } : {}),
      ...(repoName ? { repo_name: repoName } : {})
    }

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

/**
 * Analyzes the quality of a single answer using Groq (STAR, Relevance, Clarity, Confidence).
 */
export async function analyzeAnswerQuality(
  question: string,
  answer: string
): Promise<{
  star_score: number
  relevance_score: number
  clarity_score: number
  confidence_score: number
  hints: string[]
  summary: string
}> {
  try {
    const systemPrompt = `You are an expert AI interviewer evaluating a candidate's answer to a specific interview question.
Analyze the candidate's answer for:
1. STAR method usage — Situation, Task, Action, Result. Did they structure it well?
2. Relevance — Did they actually answer the question asked?
3. Clarity & conciseness — Rambling, repetition, staying on point.
4. Language confidence — Assertive vs hesitant phrasing (e.g. "I think maybe..." vs "I did...").

You MUST return a valid JSON object matching this exact structure:
{
  "star_score": <score from 0 to 10>,
  "relevance_score": <score from 0 to 10>,
  "clarity_score": <score from 0 to 10>,
  "confidence_score": <score from 0 to 10>,
  "hints": ["1-2 actionable quick hints for improvement"],
  "summary": "1 sentence brief feedback summary"
}
Ensure all scores are integers between 0 and 10. Do not include markdown code block wraps. Return only the raw JSON string.`

    const prompt = `Question asked: "${question}"
Candidate's Answer: "${answer}"`

    const response = await callGroqJson(systemPrompt, prompt, 0.2)
    const cleaned = cleanJsonResponseText(response)
    return JSON.parse(cleaned)
  } catch (err) {
    console.error("Error in analyzeAnswerQuality:", err)
    // Fallback if Groq fails
    return {
      star_score: 7,
      relevance_score: 7,
      clarity_score: 7,
      confidence_score: 7,
      hints: ["Try to structure your answer using the STAR method.", "Maintain direct relevance to the question."],
      summary: "Your answer was reasonable but could be more structured and assertive."
    }
  }
}

/**
 * Generates the final behavioral report based on answer scores and physical metrics.
 */
export async function generateBehavioralReport(
  answerScores: any[],
  physicalMetrics: any[]
): Promise<string> {
  try {
    const systemPrompt = `You are an expert public speaking, communications, and career coach.
Analyze the candidate's combined mock interview data:
1. Answer quality scores evaluating STAR structure, relevance, clarity, and confidence.
2. Physical behavior metrics evaluating eye contact %, posture stability, facial engagement, and fidgeting frequency aggregated over 30-second intervals.

Generate a unified, comprehensive, and premium feedback report.
The report must cover:
- Answer quality trends across all questions.
- Physical behavior patterns across the full session.
- Specific actionable improvements.

Keep the report professional, constructive, and highly actionable (around 2-3 short, engaging paragraphs). Focus on providing a balanced view of strengths and areas for growth. Do not return any JSON or markdown headers. Just return the raw paragraphs.`

    const prompt = `Answer Quality Scores: ${JSON.stringify(answerScores)}
Physical Behavior Metrics: ${JSON.stringify(physicalMetrics)}`

    const response = await callGroqText([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ], 0.5)

    return response.trim()
  } catch (err) {
    console.error("Error generating final behavioral report:", err)
    return "You completed the session successfully. Your communication style was engaging, and you kept good composure. Focus on refining your response structures using the STAR method and keeping hand movements minimal during technical answers."
  }
}

/**
 * Saves the behavioral analysis report to Supabase.
 */
export async function saveBehavioralReport(
  sessionId: string,
  answerScores: any[],
  physicalMetrics: any[],
  finalReport: string,
  speakingAnalysis?: any
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

    const { error } = await supabase.from("behavioral_analysis").insert({
      user_id: userId,
      session_id: sessionId,
      answer_scores: answerScores,
      physical_metrics: physicalMetrics,
      final_report: finalReport,
      speaking_analysis: speakingAnalysis || null
    })

    if (error) {
      console.error("Error saving behavioral report in Supabase:", error)
      return false
    }
    return true
  } catch (e) {
    console.error("Supabase saveBehavioralReport failed:", e)
    return false
  }
}

/**
 * Fetches the behavioral analysis report from Supabase for a given session ID.
 */
export async function getBehavioralReport(sessionId: string) {
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
      .from("behavioral_analysis")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching behavioral report from Supabase:", error)
      return null
    }

    return data
  } catch (e) {
    console.error("Supabase getBehavioralReport failed:", e)
    return null
  }
}

/**
 * Generates natural language speaking feedback for a single answer using Groq.
 */
export async function analyzeAnswerSpeaking(
  question: string,
  answer: string,
  metrics: {
    wordCount: number;
    fillerCount: number;
    fillerWords: Record<string, number>;
    avgWordsPerSentence: number;
    overusedWords: string[];
    hesitationPhrases: Record<string, number>;
  }
): Promise<string> {
  try {
    const systemPrompt = `You are an expert public speaking coach.
Analyze the candidate's answer based on the following computed metrics and the transcript:
1. Filler words used: ${metrics.fillerCount} times (${JSON.stringify(metrics.fillerWords)})
2. Average sentence complexity: ${metrics.avgWordsPerSentence} words per sentence
3. Top overused words: ${JSON.stringify(metrics.overusedWords)}
4. Hesitation phrases used: ${JSON.stringify(metrics.hesitationPhrases)}

Provide natural language speaking feedback for this answer.
Your feedback MUST cover:
- Filler word usage (constructive advice, e.g. "You used filler words 8 times — try replacing 'like' with a brief pause").
- Sentence structure & complexity (e.g. "Your answers averaged 18 words per sentence which is clear and digestible").
- Vocabulary variety & repetition (e.g. "You repeated the word 'thing' 5 times — try varying your vocabulary").
- Hesitation patterns (e.g. "Phrases like 'I think' and 'maybe' appeared frequently — use more assertive language").

Keep the feedback highly actionable, direct, and concise (1 short paragraph of 3-4 sentences maximum). Do not return markdown headers or JSON. Just return the raw paragraph.`

    const prompt = `Question asked: "${question}"
Candidate's Answer: "${answer}"`

    const response = await callGroqText([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ], 0.4)

    return response.trim()
  } catch (err) {
    console.error("Error in analyzeAnswerSpeaking:", err)
    return `You spoke clearly. Try to replace filler words with brief pauses and use more assertive phrasing instead of hesitations like "I think".`
  }
}

/**
 * Generates a session-level speaking summary using Groq.
 */
export async function generateSessionSpeakingSummary(
  aggregatedMetrics: {
    totalFillerCount: number;
    mostUsedFillers: string[];
    avgSentenceComplexity: number;
    mostOverusedWords: string[];
    hesitationScore: "Low" | "Medium" | "High";
  }
): Promise<string> {
  try {
    const systemPrompt = `You are an expert public speaking, communication, and speech coaching expert.
Analyze the candidate's aggregated speaking metrics over the entire interview session:
- Total filler words used: ${aggregatedMetrics.totalFillerCount}
- Most common filler words: ${aggregatedMetrics.mostUsedFillers.join(", ")}
- Average words per sentence: ${aggregatedMetrics.avgSentenceComplexity}
- Frequently overused words: ${aggregatedMetrics.mostOverusedWords.join(", ")}
- Overall hesitation level: ${aggregatedMetrics.hesitationScore}

Write a professional, constructive, and premium session-level speaking summary. Highlight the key strengths in their delivery (such as pacing) and provide 1-2 major focal areas for their next interview.

Keep the summary concise and engaging (1 paragraph of 3-4 sentences). Do not include markdown headers or bullet points. Just return the raw text paragraph.`

    const prompt = `Aggregated Speaking Metrics: ${JSON.stringify(aggregatedMetrics)}`

    const response = await callGroqText([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ], 0.5)

    return response.trim()
  } catch (err) {
    console.error("Error in generateSessionSpeakingSummary:", err)
    return "Overall, your pacing was solid, but you relied on filler words throughout the session. Try to slow down slightly and pause intentionally rather than using fillers."
  }
}

/**
 * Updates the interviews table with proctoring violations and flag details.
 */
export async function saveProctoringLog(
  interviewId: string,
  log: {
    violations: any[];
    totalCount: number;
    isFlagged: boolean;
    terminatedEarly: boolean;
  }
): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return false
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("interviews")
      .update({
        proctoring_log: log,
        is_flagged: log.isFlagged,
        status: log.terminatedEarly ? "terminated" : "completed"
      })
      .eq("id", interviewId)

    if (error) {
      console.error("Error updating proctoring log inside Supabase interviews table:", error)
      return false
    }
    return true
  } catch (e) {
    console.error("Supabase saveProctoringLog failed:", e)
    return false
  }
}

/**
 * Retrieves the full interviews session details (including proctoring logs).
 */
export async function getInterviewSession(interviewId: string) {
  try {
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      return null
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching interview session from Supabase:", error)
      return null
    }
    return data
  } catch (e) {
    console.error("Supabase getInterviewSession failed:", e)
    return null
  }
}

/**
 * Checks if the user has a connected GitHub account.
 */
export async function checkGitHubConnection(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    return cookieStore.has("sb-github-provider-token")
  } catch (e) {
    console.error("Failed to check GitHub connection cookie:", e)
    return false
  }
}

/**
 * Fetches the user's cached GitHub analysis from Supabase on the server.
 */
export async function getGitHubAnalysis(): Promise<any | null> {
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
      .from("github_analysis")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching github analysis in action:", error)
      return null
    }

    return data
  } catch (e) {
    console.error("getGitHubAnalysis failed:", e)
    return null
  }
}
