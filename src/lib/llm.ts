import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, ModelParams } from "@google/generative-ai"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

/**
 * Gemini content filtering.
 *
 * These were previously both BLOCK_NONE, which disabled harassment and
 * hate-speech filtering entirely. This product is sold to schools and its own
 * marketing page describes handling minors' data, so the filters stay on at
 * Google's standard threshold. The "roast" interviewer persona still works —
 * it is sarcasm within the model's safety envelope, which is where it belongs.
 */
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

/**
 * Upstream request budget. A plain `fetch` has no timeout, and racing it
 * against a timer (as aiRouter does) resolves our promise while leaving the
 * request — and the serverless invocation paying for it — running. An
 * AbortSignal actually cancels it.
 */
const LLM_TIMEOUT_MS = 30_000

/** True when a Groq key is available under either of the names we accept. */
function groqKey(): string | undefined {
  return process.env.GROQ_API_KEY || process.env.INTERVIEW_GROQ_API_KEY
}

// Helper to strip markdown json code block fences and <think> reasoning tags if returned by LLM
export function cleanJsonResponseText(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  // Strip closed <think>...</think> tags
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip unclosed <think>... prefix if cut off
  if (cleaned.startsWith("<think>")) {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace !== -1) {
      cleaned = cleaned.substring(firstBrace).trim();
    }
  }
  // Strip markdown code block fences (```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  // Extract content between first '{' and last '}' if extra text exists
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

export function safeParseJSON<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleaned = cleanJsonResponseText(text);
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch (err) {
    // Deliberately not the whole payload. These responses are grader output
    // about a candidate's submission and can carry their code and answers
    // verbatim; a parse failure does not justify copying that into the server
    // log. The length and opening characters are enough to tell a truncation
    // from a wrong-shape response.
    console.warn(
      `safeParseJSON fallback used (${text.length} chars, starts: ${JSON.stringify(text.slice(0, 80))}):`,
      err
    );
    return fallback;
  }
}

/**
 * Call the Groq API (OpenAI compatible endpoint)
 */
export async function callGroqText(messages: ChatMessage[], temperature: number): Promise<string> {
  const apiKey = groqKey()
  if (!apiKey) throw new Error("GROQ_API_KEY not configured")
  const model = process.env.GROQ_INTERVIEW_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b"

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API returned status ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

/**
 * Call the Groq API expecting JSON
 */
export async function callGroqJson(systemPrompt: string | undefined, prompt: string, temperature: number): Promise<string> {
  const apiKey = groqKey()
  if (!apiKey) throw new Error("GROQ_API_KEY not configured")
  const model = process.env.GROQ_INTERVIEW_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b"

  const messages: ChatMessage[] = []
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API returned status ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

/**
 * Call the OpenAI API
 */
export async function callOpenAIText(messages: ChatMessage[], temperature: number, model: string = "gpt-4o-mini"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

/**
 * Call the OpenAI API expecting JSON
 */
export async function callOpenAIJson(systemPrompt: string | undefined, prompt: string, temperature: number, model: string = "gpt-4o-mini"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")

  const messages: ChatMessage[] = []
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

/**
 * Call the Gemini API
 */
export async function callGeminiText(
  systemPrompt: string | undefined,
  messages: ChatMessage[],
  temperature: number,
  modelName: string = "gemini-2.5-flash"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured")

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Exclude system message from messages array if provided separately
  const conversationMessages = messages.filter(m => m.role !== "system")
  const contents = conversationMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const modelOptions: ModelParams = {
    model: modelName,
    safetySettings,
    generationConfig: { temperature }
  }

  if (systemPrompt) {
    modelOptions.systemInstruction = systemPrompt
  } else {
    // If system was part of messages, extract it
    const systemMsg = messages.find(m => m.role === "system")
    if (systemMsg) {
      modelOptions.systemInstruction = systemMsg.content
    }
  }

  const model = genAI.getGenerativeModel(modelOptions)
  const result = await model.generateContent({ contents })
  return result.response.text().trim()
}

/**
 * Call the Gemini API expecting JSON
 */
export async function callGeminiJson(
  systemPrompt: string | undefined,
  prompt: string,
  temperature: number,
  modelName: string = "gemini-2.5-flash"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured")

  const genAI = new GoogleGenerativeAI(apiKey)

  const modelOptions: ModelParams = {
    model: modelName,
    safetySettings,
    generationConfig: {
      temperature,
      responseMimeType: "application/json"
    }
  }

  if (systemPrompt) {
    modelOptions.systemInstruction = systemPrompt
  }

  const model = genAI.getGenerativeModel(modelOptions)
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
