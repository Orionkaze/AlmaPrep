import { 
  callGroqText, 
  callGroqJson, 
  callOpenAIText, 
  callOpenAIJson, 
  callGeminiText, 
  callGeminiJson,
  cleanJsonResponseText
} from "@/lib/llm"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { createClient } from "@/lib/supabase/server"
import { getProgramQuestions, getSampleQuestions } from "./programs"
import { readLocalCache } from "@/lib/localCache"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// Helper function to enforce a promise timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${name} API call timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

/**
 * Unified callAI function. Executes LLM routing directly in-process on the server.
 */
export async function callAI(prompt: string, task: string, userTier: string): Promise<string> {
  let userId: string | undefined = undefined
  try {
    const user = await getCurrentUser()
    userId = user.userId || undefined
  } catch (e) {
    // Suppress if not in request context
  }

  const { text } = await executeAIRouting(prompt, task, userTier, userId)
  return text
}

/**
 * Unified callAIWithSource function. Executes LLM routing directly in-process on the server.
 */
export async function callAIWithSource(
  prompt: string,
  task: string,
  userTier: string
): Promise<{ result: string; source: string }> {
  let userId: string | undefined = undefined
  try {
    const user = await getCurrentUser()
    userId = user.userId || undefined
  } catch (e) {
    // Suppress if not in request context
  }

  const { text, source } = await executeAIRouting(prompt, task, userTier, userId)
  return { result: text, source }
}

/**
 * Executes the actual LLM calls on the server.
 */
export async function executeAIRouting(
  prompt: string,
  task: string,
  userTier: string,
  userId?: string
): Promise<{ text: string; source: string }> {
  const timeoutMs = task === "next_question" ? 5000 : 20000 // 5 seconds for questions, 20 seconds for feedback and resume analysis

  // 1. Prepare prompts based on task
  let systemPrompt: string | undefined = undefined
  let promptText = ""
  let messages: ChatMessage[] = []
  let isJson = false

  if (task === "next_question") {
    isJson = false
    const parsed = JSON.parse(prompt)
    const category = parsed.category
    const previousMessages = parsed.previousMessages || []
    const useResume = parsed.useResume || false
    const persona = parsed.persona || "supportive"

    let resumeText = ""
    if (useResume && userId) {
      try {
        const supabase = await createClient()
        const { data } = await supabase
          .from("users")
          .select("resume_text")
          .eq("id", userId)
          .single()
        if (data && data.resume_text) {
          resumeText = data.resume_text
        }
      } catch (err) {
        console.error("aiRouter: Failed to fetch resume in next_question task:", err)
      }
    }

    const mainQuestions = getProgramQuestions(category)
    let questions = [...mainQuestions]
    if ((!questions || questions.length === 0) && ["hr", "technical", "mixed"].includes(category)) {
      questions = getSampleQuestions(category)
    }

    // Load key universal questions to combine with program-specific questions for LLM context
    const suffix = category.endsWith("-b") ? "-b" : "-a"
    const introQuestions = [
      ...getProgramQuestions(`motivation-fit${suffix}`).slice(0, 5),
      ...getProgramQuestions(`personal-background${suffix}`).slice(0, 5)
    ]
    const combinedQuestionsForLLM = [...introQuestions, ...questions]
    const uniqueQuestions = Array.from(new Map(combinedQuestionsForLLM.map(q => [q.id, q])).values())

    let resumeContextPrompt = ""
    if (resumeText) {
      if (uniqueQuestions && uniqueQuestions.length > 0) {
        resumeContextPrompt = `The candidate has provided their resume for customization:
---
${resumeText}
---
IMPORTANT: Integrate the candidate's resume context with the Question Bank. For the selected questions or follow-ups, tailor them to refer to the candidate's projects, technologies, and experiences where relevant. For example, if a question in the bank asks about database design, ask it in the context of a database project listed on their resume.`
      } else {
        resumeContextPrompt = `The candidate has provided their resume for customization:
---
${resumeText}
---
Focus your interview questions on their background, experiences, projects, and technologies listed in the resume, while still aligning with the "${category}" interview category.`
      }
    }

    let personaPrompt = "You are a professional, encouraging, and standard recruiter."
    if (persona === "roast") {
      personaPrompt = "You are in ROAST MODE 💀. You are brutally honest, highly sarcastic, funny, and hyper-critical. Roast the candidate's answers while asking your follow-up questions. Be mean but entertaining."
    } else if (persona === "strict") {
      personaPrompt = "You are an extremely strict, cold, and formal interviewer. You have extremely high standards, you do not show emotion, and you ask intense follow-up questions to test the candidate's true depth of knowledge."
    } else if (persona === "supportive") {
      personaPrompt = "You are a very supportive, warm, and friendly interviewer. You want the candidate to succeed, so you offer gentle encouragement before asking the next question."
    }

    const isGithubMode = parsed.mode === "github"
    const currentRepoName = parsed.currentRepoName || ""

    let githubContextPrompt = ""
    if (isGithubMode && userId && currentRepoName) {
      try {
        const supabase = await createClient()
        let { data: analysis, error: fetchError } = await supabase
          .from("github_analysis")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()
        
        if (fetchError || !analysis) {
          analysis = readLocalCache("github_analysis", userId)
        }
        
        if (analysis) {
          const repoMeta = analysis.repo_metadata?.[currentRepoName]
          const repoQuestions = (analysis.questions || []).filter((q: any) => q.repo === currentRepoName)
          const techStack = analysis.tech_stack || []
          const designPatterns = analysis.design_patterns || []
          
          githubContextPrompt = `
You are currently in GitHub Mode. The candidate has selected to focus on their repository: "${currentRepoName}".
Here is the context for this repository:
- Tech Stack: ${techStack.join(", ")}
- Design Patterns: ${designPatterns.join(", ")}
- Repository Metadata: ${repoMeta ? JSON.stringify(repoMeta) : "None"}
- Target Pre-generated Questions: ${JSON.stringify(repoQuestions)}

IMPORTANT RULES:
1. You are asking a dynamic follow-up question or continuing the discussion about the repository "${currentRepoName}".
2. Frame your question to refer to the candidate's repository context, code structure, or technologies.
3. Be highly technical, realistic, and specific. Analyze their previous answer and drill down into their implementation details, design choices, or trade-offs.
`
        }
      } catch (err) {
        console.error("aiRouter: Failed to fetch github analysis for follow-up:", err)
      }
    }

    let domainSpecificPrompt = ""
    if (isGithubMode && githubContextPrompt) {
      domainSpecificPrompt = githubContextPrompt
    } else if (uniqueQuestions && uniqueQuestions.length > 0) {
      const fallbackProgramName = category
        .split("-")
        .filter((w: string) => w !== "a" && w !== "b")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || category;

      const programName = mainQuestions[0]?.program || (category === "hr" ? "HR (Human Resources)" : category === "technical" ? "Technical Interview" : category === "mixed" ? "Mixed Interview" : fallbackProgramName)
      
      domainSpecificPrompt = `
You are interviewing the candidate for: "${programName}".
Here is the official Question Bank of standard questions for this domain. You must select questions from this bank to structure the interview:
---
${JSON.stringify(uniqueQuestions.map(q => ({
  id: q.id,
  subtopic: q.subtopic,
  question: q.question,
  lookingFor: q.lookingFor,
  followUps: q.followUps,
  commonMistakes: q.commonMistakes
})), null, 2)}
---

Rules for utilizing the Question Bank:
1. Start the interview by selecting an introductory question from the bank (typically from the "Motivation & Fit" category or a general icebreaker).
2. For each follow-up:
   - Ask follow-up questions to probe the candidate's depth of knowledge or address mistakes in their previous answer (use the "lookingFor", "commonMistakes", and "followUps" fields of the current question for guidance).
   - Once the candidate has answered a question adequately or if they struggle, transition to a new question from the Question Bank.
3. Track the conversation history carefully. Do not repeat questions from the bank that have already been asked or covered.
4. Aim to cover a variety of subtopics.
`
    }

    systemPrompt = `You are an expert AI Interviewer conducting a mock interview for the category: "${category}".
${personaPrompt}
Your goal is to conduct a realistic and interactive conversation in this exact persona.
Assess the candidate's answers, ask relevant follow-up questions, or transition to a new topic as appropriate.
${resumeContextPrompt}
${domainSpecificPrompt}

Rules:
1. Keep your responses concise, natural, and conversational (1-3 sentences maximum). Stay deeply in your persona.
2. Do not use any markdown formatting, prefixing, headers, or bullet points (e.g. do not write "Question: ..."). Just output the raw conversational text.
3. If this is the start of the interview (no candidate answers yet), ask a relevant introductory question tailored to the "${category}" category (or from the question bank if available).
4. If the candidate has already answered 9 or 10 questions, politely wrap up the interview (in your persona). Make sure to include a concluding salutation (e.g., "It was nice speaking with you. I will now analyze our conversation to prepare your feedback.") and do NOT ask any further questions.`

    const formattedMessages = previousMessages.map((msg: any) => ({
      role: msg.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    }))

    if (formattedMessages.length === 0) {
      formattedMessages.push({ role: "user", content: "Hello, please introduce yourself and ask the first question." })
    }

    messages = formattedMessages
  } else if (task === "generate_feedback") {
    isJson = true
    const parsed = JSON.parse(prompt)
    const category = parsed.category
    const feedbackMessages = parsed.messages || []
    
    const transcript = feedbackMessages
      .map((msg: any) => `${msg.role === "ai" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n")

    let questions = getProgramQuestions(category)
    if ((!questions || questions.length === 0) && ["hr", "technical", "mixed"].includes(category)) {
      questions = getSampleQuestions(category)
    }
    let domainSpecificFeedbackPrompt = ""
    if (questions && questions.length > 0) {
      const fallbackProgramName = category
        .split("-")
        .filter((w: string) => w !== "a" && w !== "b")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || category;

      const programName = questions[0].program || (category === "hr" ? "HR (Human Resources)" : category === "technical" ? "Technical Interview" : category === "mixed" ? "Mixed Interview" : fallbackProgramName)
      
      domainSpecificFeedbackPrompt = `
The interview was conducted for: "${programName}".
Here is the official Question Bank containing the ideal criteria and model answers for reference:
---
${JSON.stringify(questions.map(q => ({
  id: q.id,
  question: q.question,
  lookingFor: q.lookingFor,
  idealAnswer: q.idealAnswer
})), null, 2)}
---
Evaluate the candidate's answers against the "lookingFor" criteria and "idealAnswer" models for the specific questions that were asked in the transcript. Provide concrete feedback showing where they matched these standards or where they fell short.
`
    }

    systemPrompt = `You are an expert interviewer evaluating a candidate's performance in a mock interview for the category: "${category}".`
    promptText = `Analyze the following transcript of the mock interview:
${transcript}

${domainSpecificFeedbackPrompt}

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

    If no question bank was used, return an empty array [] for "questionEvaluation".
    Ensure all scores are numbers, and no extra text or markdown formatting is returned. Just the raw JSON object.`
  } else if (task === "analyze_resume") {
    isJson = true
    const resumeText = prompt
    systemPrompt = "You are an expert resume reviewer and career coach."
    promptText = `Analyze the following resume text and generate a structured JSON analysis report.

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
  } else {
    throw new Error(`aiRouter: Unsupported task "${task}"`)
  }

  // 2. Define chain: always Groq -> Gemini -> OpenAI for all tasks
  const chain = [
    {
      name: "groq",
      keyExists: !!process.env.GROQ_API_KEY,
      fn: async () => {
        if (isJson) {
          return await callGroqJson(systemPrompt, promptText, 0.7)
        } else {
          const fullMessages = [...messages]
          if (systemPrompt) {
            fullMessages.unshift({ role: "system", content: systemPrompt })
          }
          return await callGroqText(fullMessages, 0.7)
        }
      },
    },
    {
      name: "gemini",
      keyExists: !!process.env.GEMINI_API_KEY,
      fn: async () => {
        if (isJson) {
          return await callGeminiJson(systemPrompt, promptText, 0.7, "gemini-1.5-pro")
        } else {
          return await callGeminiText(systemPrompt, messages, 0.7, "gemini-1.5-pro")
        }
      },
    },
    {
      name: "openai",
      keyExists: !!process.env.OPENAI_API_KEY,
      fn: async () => {
        if (isJson) {
          return await callOpenAIJson(systemPrompt, promptText, 0.7, "gpt-4o")
        } else {
          const fullMessages = [...messages]
          if (systemPrompt) {
            fullMessages.unshift({ role: "system", content: systemPrompt })
          }
          return await callOpenAIText(fullMessages, 0.7, "gpt-4o")
        }
      },
    },
  ]

  const activeChain = chain.filter(p => p.keyExists)
  if (activeChain.length === 0) {
    throw new Error("No LLM API keys configured for routing")
  }

  let lastError: Error | null = null

  for (const provider of activeChain) {
    try {
      console.log(`[aiRouter] Routing ${task} request to ${provider.name}...`)
      const result = await withTimeout(provider.fn(), timeoutMs, provider.name)
      console.log(`[aiRouter] Success with ${provider.name}`)
      return { text: result, source: provider.name }
    } catch (err: any) {
      console.error(`[aiRouter] Provider ${provider.name} failed:`, err.message || err)
      lastError = err
    }
  }

  throw new Error(`All LLM providers in the fallback chain failed. Last error: ${lastError?.message || "Unknown error"}`)
}
