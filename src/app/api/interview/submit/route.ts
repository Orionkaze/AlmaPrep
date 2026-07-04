import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const { session_id, test_results } = body;

    if (!session_id || !test_results) {
      return NextResponse.json({ error: "Missing session_id or test_results" }, { status: 400 });
    }

    const supabase = await createClient();
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user || null;
    } catch (e) {}

    const isLocalDemo = !authUser && (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz.supabase.co")
    );

    if (!authUser && !isLocalDemo) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser ? authUser.id : "demo-user-id";

    // 1. Fetch Session and Challenge using localDb-aware helpers
    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const challenge = await getChallengeById(session.challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // 2. Validate Client-Sent Test Results Structure (prevent spoofing)
    if (
      typeof test_results.passed !== "number" ||
      typeof test_results.failed !== "number" ||
      typeof test_results.total !== "number" ||
      !Array.isArray(test_results.results)
    ) {
      return NextResponse.json({ error: "Invalid test_results format" }, { status: 400 });
    }

    // Cross-reference test count with challenge tests count
    const dbTestCount = (challenge.hidden_tests || []).length;
    if (test_results.total !== dbTestCount) {
      return NextResponse.json({
        error: `Test count mismatch. Expected ${dbTestCount} tests, received ${test_results.total}.`
      }, { status: 400 });
    }

    // Extract user code
    const codebase = session.current_codebase || {};
    const firstFileKey = Object.keys(codebase)[0] || "solution.js";
    const userCode = codebase[firstFileKey] || "";
    const challengeSlug = challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const lang = challenge.language || "javascript";

    // 3. Groq API for Layer 2 & Layer 3 Analysis
    const apiKey = process.env.INTERVIEW_GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "INTERVIEW_GROQ_API_KEY not configured" }, { status: 500 });
    }

    // Layer 2 Prompt: Logic & Correctness Grader
    const logicGraderPrompt = `You are a strict technical interviewer. Grade the user's coding solution on correctness, logic, time, and space complexity.
Problem statement: ${challenge.description}
Starter code: ${JSON.stringify(challenge.starter_code)}
User's submitted solution:
${userCode}

Evaluate:
- Does the code actually solve the problem correctly, even if test cases passed?
- What edge cases (e.g. empty inputs, null values, huge bounds) does this solution miss?
- What is the time complexity? (e.g. "O(n)", "O(n log n)")
- What is the space complexity? (e.g. "O(1)", "O(n)")
- A logicScore from 0 to 10.

You must respond ONLY with a valid JSON object matching this structure (no markdown, no other text):
{
  "logicScore": 8,
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "edgeCasesMissed": ["Handles empty array", "Negative numbers"],
  "logicFeedback": "Brief explanation of logic correctness and efficiency"
}`;

    // Layer 3 Prompt: Code Quality Grader
    const qualityGraderPrompt = `You are a strict code quality auditor. Grade the user's coding solution on readability, naming conventions, idioms, complexity, and redundancy.
User's submitted solution:
${userCode}

Evaluate:
- Readability score (0 to 10)
- Quality score (0 to 10)
- Code smells, redundancy, naming conventions, or missing error handling.

You must respond ONLY with a valid JSON object matching this structure (no markdown, no other text):
{
  "qualityScore": 8,
  "readabilityScore": 9,
  "issues": ["Naming style", "Lack of comments"],
  "suggestions": ["Use meaningful variable names", "Add error boundaries"]
}`;

    // Perform Groq Layer 2 call
    const logicRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a software grading agent. Output JSON only." },
          { role: "user", content: logicGraderPrompt }
        ],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!logicRes.ok) {
      const errTxt = await logicRes.text();
      return NextResponse.json({ error: `Groq logic grading failed: ${errTxt}` }, { status: 500 });
    }

    const logicData = await logicRes.json();
    const parsedLogic = JSON.parse(cleanJsonResponseText(logicData.choices?.[0]?.message?.content || "{}"));

    // Perform Groq Layer 3 call
    const qualityRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a software grading agent. Output JSON only." },
          { role: "user", content: qualityGraderPrompt }
        ],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!qualityRes.ok) {
      const errTxt = await qualityRes.text();
      return NextResponse.json({ error: `Groq quality grading failed: ${errTxt}` }, { status: 500 });
    }

    const qualityData = await qualityRes.json();
    const parsedQuality = JSON.parse(cleanJsonResponseText(qualityData.choices?.[0]?.message?.content || "{}"));

    // 4. Evaluate Success Criteria
    const passRatio = test_results.passed / test_results.total;
    const isSuccess = passRatio >= 0.7 && (parsedLogic.logicScore || 0) >= 7 && (parsedQuality.qualityScore || 0) >= 6;

    // 5. Update attempts counter & Save solution in Supabase if logged in
    let attempts = 1;
    let saveErr = null;

    if (authUser) {
      // Check if solution already exists to increment attempts
      const { data: existingSol, error: fetchSolErr } = await supabase
        .from("coding_solutions")
        .select("id, attempts")
        .eq("user_id", userId)
        .eq("challenge_id", challenge.id)
        .maybeSingle();

      if (existingSol) {
        attempts = (existingSol.attempts || 1) + 1;
        const { error } = await supabase
          .from("coding_solutions")
          .update({
            solution_code: userCode,
            test_results: test_results,
            logic_score: parsedLogic.logicScore || 0,
            quality_score: parsedQuality.qualityScore || 0,
            attempts: attempts,
            language: lang,
            challenge_slug: challengeSlug
          })
          .eq("id", existingSol.id);
        saveErr = error;
      } else {
        const { error } = await supabase
          .from("coding_solutions")
          .insert({
            user_id: userId,
            challenge_id: challenge.id,
            challenge_slug: challengeSlug,
            language: lang,
            solution_code: userCode,
            test_results: test_results,
            logic_score: parsedLogic.logicScore || 0,
            quality_score: parsedQuality.qualityScore || 0,
            attempts: 1
          });
        saveErr = error;
      }

      if (saveErr) {
        console.error("Error saving coding solution:", saveErr);
        return NextResponse.json({ error: `Failed to save solution: ${saveErr.message}` }, { status: 500 });
      }
    }

    // 6. Update session status to evaluated using helper (handles mock or live DB)
    await updateSession(session_id, {
      status: "evaluated",
      submitted_code: codebase,
      submitted_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: isSuccess,
      attempts: attempts,
      evaluation: {
        logic: parsedLogic,
        quality: parsedQuality,
        tests: test_results
      }
    });

  } catch (err: any) {
    console.error("Error in submit API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
