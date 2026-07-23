import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

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

// Helper to strip markdown json code block fences if returned by LLM
export function cleanJsonResponseText(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "")
  }
  return cleaned.trim()
}

/**
 * Call the Groq API (OpenAI compatible endpoint)
 */
export async function callGroqText(messages: ChatMessage[], temperature: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.INTERVIEW_GROQ_API_KEY
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
  const apiKey = process.env.GROQ_API_KEY || process.env.INTERVIEW_GROQ_API_KEY
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

  const modelOptions: any = {
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

  const modelOptions: any = {
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

/**
 * Generate a text response using the hybrid fallback chain (Groq -> OpenAI -> Gemini)
 */
export async function getLLMResponse({
  systemPrompt,
  messages,
  temperature = 0.7,
}: {
  systemPrompt?: string
  messages: ChatMessage[]
  temperature?: number
}): Promise<string> {
  const providers = [
    {
      name: "Groq",
      keyExists: !!process.env.GROQ_API_KEY,
      fn: () => {
        // Embed systemPrompt at the start of messages if present
        const fullMessages = [...messages]
        if (systemPrompt) {
          fullMessages.unshift({ role: "system", content: systemPrompt })
        }
        return callGroqText(fullMessages, temperature)
      },
    },
    {
      name: "OpenAI",
      keyExists: !!process.env.OPENAI_API_KEY,
      fn: () => {
        const fullMessages = [...messages]
        if (systemPrompt) {
          fullMessages.unshift({ role: "system", content: systemPrompt })
        }
        return callOpenAIText(fullMessages, temperature)
      },
    },
    {
      name: "Gemini",
      keyExists: !!process.env.GEMINI_API_KEY,
      fn: () => callGeminiText(systemPrompt, messages, temperature),
    },
  ]

  const activeProviders = providers.filter(p => p.keyExists)

  if (activeProviders.length === 0) {
    throw new Error("No LLM API keys configured (checked GROQ_API_KEY, OPENAI_API_KEY, and GEMINI_API_KEY)")
  }

  let lastError: Error | null = null

  for (const provider of activeProviders) {
    try {
      console.log(`[LLM Router] Routing text generation request to ${provider.name}...`)
      const result = await provider.fn()
      console.log(`[LLM Router] Success with ${provider.name}`)
      return result
    } catch (err: any) {
      console.error(`[LLM Router] Provider ${provider.name} failed:`, err.message || err)
      lastError = err
    }
  }

  throw new Error(`All configured LLM providers failed. Last error: ${lastError?.message || "Unknown error"}`)
}

/**
 * Generate a structured JSON response using the hybrid fallback chain (OpenAI -> Gemini -> Groq)
 */
export async function getLLMJSONResponse<T>({
  systemPrompt,
  prompt,
  temperature = 0.7,
}: {
  systemPrompt?: string
  prompt: string
  temperature?: number
}): Promise<T> {
  const providers = [
    {
      name: "OpenAI",
      keyExists: !!process.env.OPENAI_API_KEY,
      fn: () => callOpenAIJson(systemPrompt, prompt, temperature),
    },
    {
      name: "Gemini",
      keyExists: !!process.env.GEMINI_API_KEY,
      fn: () => callGeminiJson(systemPrompt, prompt, temperature),
    },
    {
      name: "Groq",
      keyExists: !!process.env.GROQ_API_KEY,
      fn: () => callGroqJson(systemPrompt, prompt, temperature),
    },
  ]

  const activeProviders = providers.filter(p => p.keyExists)

  if (activeProviders.length === 0) {
    throw new Error("No LLM API keys configured (checked OPENAI_API_KEY, GEMINI_API_KEY, and GROQ_API_KEY)")
  }

  let lastError: Error | null = null

  for (const provider of activeProviders) {
    try {
      console.log(`[LLM Router] Routing JSON generation request to ${provider.name}...`)
      const rawResult = await provider.fn()
      const cleaned = cleanJsonResponseText(rawResult)
      const parsed = JSON.parse(cleaned) as T
      console.log(`[LLM Router] Success with ${provider.name}`)
      return parsed
    } catch (err: any) {
      console.error(`[LLM Router] JSON Provider ${provider.name} failed:`, err.message || err)
      lastError = err
    }
  }

  throw new Error(`All configured LLM JSON providers failed. Last error: ${lastError?.message || "Unknown error"}`)
}
