import { NextResponse } from "next/server";
import { getSessionById, getChallengeById, updateSession } from "@/lib/interviewDb";

function cleanJsonResponseText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { session_id, user_message } = body;

    if (!session_id || !user_message) {
      return NextResponse.json({ error: "Missing session_id or user_message" }, { status: 400 });
    }

    // Fetch session and challenge
    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const challenge = await getChallengeById(session.challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Append user message to conversation history
    const conversation = [...(session.conversation || [])];
    conversation.push({ role: "user", content: user_message });

    // Build the codebase representation string
    let codebaseStr = "";
    const files = session.current_codebase || {};
    for (const [filename, content] of Object.entries(files)) {
      codebaseStr += `=== ${filename} ===\n${content}\n\n`;
    }

    const apiKey = process.env.INTERVIEW_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "INTERVIEW_GROQ_API_KEY not configured. Please set it in .env.local" }, { status: 500 });
    }
    const model = process.env.GROQ_CODING_MODEL || process.env.GROQ_MODEL || "qwen3.6-2.7b";

    // Define System Prompt
    const systemPrompt = `You are an expert AI coding agent assisting a developer during a technical interview. You have full awareness of their current codebase. Your job is to help them identify problems, propose precise code changes, and explain your reasoning clearly.

IMPORTANT: Always respond in this exact JSON format, with no extra text outside the JSON:
{
  "reasoning": "Step-by-step explanation of what you analyzed, what you found, and why",
  "proposed_changes": [
    {
      "filename": "middleware/auth.js",
      "original": "exact code snippet to replace (must match exactly)",
      "replacement": "new code to put in its place",
      "explanation": "why this specific change fixes the problem"
    }
  ],
  "follow_up": "What you recommend the candidate does or asks next"
}

If answering a conceptual question without proposing changes, set proposed_changes to [].
Be precise — original snippets must match the actual code exactly so diffs can be applied programmatically.

Current codebase:
${codebaseStr.trim()}`;

    // Format message history for Groq
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...conversation.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
      }))
    ];

    // Call Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        messages: groqMessages,
        max_tokens: 2048,
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API response error:", errorText);
      return NextResponse.json({ error: `Groq API returned status ${response.status}: ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const cleanedContent = cleanJsonResponseText(rawContent);

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error("Failed to parse Groq response as JSON:", rawContent);
      return NextResponse.json({ error: "agent_parse_error", raw: rawContent });
    }

    // Append agent response to conversation and save
    conversation.push({ role: "assistant", content: parsedResponse });
    await updateSession(session_id, { conversation });

    return NextResponse.json({ agent_response: parsedResponse });
  } catch (err: any) {
    console.error("Error in /api/interview/agent route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
