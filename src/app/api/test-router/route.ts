import { NextResponse } from "next/server"
import { executeAIRouting } from "@/lib/aiRouter"

export async function GET() {
  const originalFetch = global.fetch
  const logs: string[] = []

  try {
    // We will run multiple test cases
    const results: any = {}

    // --- TEST CASE 1: Free tier user (Groq only) ---
    logs.push("Running Test Case 1: Free tier routing...")
    let groqCalled = false
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.includes("api.groq.com")) {
        groqCalled = true
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Groq response (Free Tier)" } }]
        }), { status: 200 })
      }
      return new Response("Not implemented in mock", { status: 500 })
    }

    const res1 = await executeAIRouting(
      JSON.stringify({ category: "Frontend", previousMessages: [], useResume: false }),
      "next_question",
      "free",
      "mock-user-id"
    )
    results.test1 = {
      success: res1 === "Groq response (Free Tier)" && groqCalled,
      response: res1,
      groqCalled
    }

    // --- TEST CASE 2: Pro tier user - Groq succeeds first ---
    logs.push("Running Test Case 2: Pro tier, Groq succeeds...")
    let openAICalled = false
    let geminiCalled = false
    groqCalled = false
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.includes("api.groq.com")) {
        groqCalled = true
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Groq response (Pro Tier)" } }]
        }), { status: 200 })
      }
      if (url.includes("api.openai.com")) {
        openAICalled = true
      }
      if (url.includes("googleapis.com")) {
        geminiCalled = true
      }
      return new Response("Not implemented in mock", { status: 500 })
    }

    const res2 = await executeAIRouting(
      JSON.stringify({ category: "Frontend", previousMessages: [], useResume: false }),
      "next_question",
      "pro",
      "mock-user-id"
    )
    results.test2 = {
      success: res2 === "Groq response (Pro Tier)" && groqCalled && !openAICalled && !geminiCalled,
      response: res2,
      groqCalled,
      openAICalled,
      geminiCalled
    }

    // --- TEST CASE 3: Pro tier user - Groq fails, OpenAI succeeds ---
    logs.push("Running Test Case 3: Pro tier, Groq fails, OpenAI succeeds...")
    groqCalled = false
    openAICalled = false
    geminiCalled = false
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.includes("api.groq.com")) {
        groqCalled = true
        return new Response("Groq Error", { status: 500 })
      }
      if (url.includes("api.openai.com")) {
        openAICalled = true
        return new Response(JSON.stringify({
          choices: [{ message: { content: "OpenAI response" } }]
        }), { status: 200 })
      }
      if (url.includes("googleapis.com")) {
        geminiCalled = true
      }
      return new Response("Not implemented in mock", { status: 500 })
    }

    const res3 = await executeAIRouting(
      JSON.stringify({ category: "Frontend", previousMessages: [], useResume: false }),
      "next_question",
      "pro",
      "mock-user-id"
    )
    results.test3 = {
      success: res3 === "OpenAI response" && groqCalled && openAICalled && !geminiCalled,
      response: res3,
      groqCalled,
      openAICalled,
      geminiCalled
    }

    // --- TEST CASE 4: Pro tier user - Groq and OpenAI fail, Gemini succeeds ---
    logs.push("Running Test Case 4: Pro tier, Groq & OpenAI fail, Gemini succeeds...")
    groqCalled = false
    openAICalled = false
    geminiCalled = false
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.includes("api.groq.com")) {
        groqCalled = true
        return new Response("Groq Error", { status: 500 })
      }
      if (url.includes("api.openai.com")) {
        openAICalled = true
        return new Response("OpenAI Error", { status: 500 })
      }
      if (url.includes("googleapis.com") || url.includes("generativelanguage")) {
        geminiCalled = true
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Gemini response" }] } }]
        }), { status: 200 })
      }
      return new Response("Not implemented in mock", { status: 500 })
    }

    const res4 = await executeAIRouting(
      JSON.stringify({ category: "Frontend", previousMessages: [], useResume: false }),
      "next_question",
      "pro",
      "mock-user-id"
    )
    results.test4 = {
      success: res4 === "Gemini response" && groqCalled && openAICalled && geminiCalled,
      response: res4,
      groqCalled,
      openAICalled,
      geminiCalled
    }

    // --- TEST CASE 5: Pro tier user - Groq times out, OpenAI succeeds ---
    logs.push("Running Test Case 5: Pro tier, Groq times out (>10s), OpenAI succeeds...")
    groqCalled = false
    openAICalled = false
    geminiCalled = false
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.includes("api.groq.com")) {
        groqCalled = true
        // Simulate a 12 second delay to trigger the 10 second timeout in aiRouter
        await new Promise(resolve => setTimeout(resolve, 11000))
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Groq delayed response" } }]
        }), { status: 200 })
      }
      if (url.includes("api.openai.com")) {
        openAICalled = true
        return new Response(JSON.stringify({
          choices: [{ message: { content: "OpenAI response after Groq timeout" } }]
        }), { status: 200 })
      }
      return new Response("Not implemented in mock", { status: 500 })
    }

    const startTime = Date.now()
    const res5 = await executeAIRouting(
      JSON.stringify({ category: "Frontend", previousMessages: [], useResume: false }),
      "next_question",
      "pro",
      "mock-user-id"
    )
    const duration = Date.now() - startTime
    results.test5 = {
      success: res5 === "OpenAI response after Groq timeout" && groqCalled && openAICalled && duration >= 10000 && duration < 12000,
      response: res5,
      durationMs: duration,
      groqCalled,
      openAICalled
    }

    return NextResponse.json({
      success: true,
      results,
      logs
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 })
  } finally {
    global.fetch = originalFetch
  }
}
