import { NextResponse } from "next/server";
import { getSessionById, getChallengeById, updateSession, createReport } from "@/lib/interviewDb";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

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
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1. Fetch Session and Challenge
    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const challenge = await getChallengeById(session.challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Update session status to submitted first, save submitted code
    const codebase = session.current_codebase || {};
    const submittedAt = new Date().toISOString();
    await updateSession(session_id, {
      status: "submitted",
      submitted_at: submittedAt,
      submitted_code: codebase
    });

    // 2. Generate and Run Hidden Tests via Piston API
    const testRunnerCode = `
const Module = require('module');
const crypto = require('crypto');

// Mock jsonwebtoken for sandbox environment
const mockJwt = {
  verify: (token, secret) => {
    if (!token) throw new Error('No token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    const [headerB64, payloadB64, signatureB64] = parts;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(\`\${headerB64}.\${payloadB64}\`);
    const expectedSignature = hmac.digest('base64')
      .replace(/=/g, '')
      .replace(/\\+/g, '-')
      .replace(/\\//g, '_');
    if (signatureB64 !== expectedSignature) {
      throw new Error('invalid signature');
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new Error('jwt expired');
    }
    return payload;
  },
  sign: (payload, secret, options = {}) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const extendedPayload = { ...payload };
    if (options.expiresIn) {
      if (options.expiresIn.startsWith('-')) {
        extendedPayload.exp = Math.floor(Date.now() / 1000) - 10;
      } else {
        extendedPayload.exp = Math.floor(Date.now() / 1000) + 3600;
      }
    }
    const payloadB64 = Buffer.from(JSON.stringify(extendedPayload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(\`\${headerB64}.\${payloadB64}\`);
    const signatureB64 = hmac.digest('base64url');
    return \`\${headerB64}.\${payloadB64}.\${signatureB64}\`;
  }
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'jsonwebtoken') return mockJwt;
  return originalRequire.apply(this, arguments);
};

const originalConsoleLog = console.log;
console.log = () => {};
const originalConsoleError = console.error;
console.error = () => {};

const results = [];

let authenticate;
let router;
try {
  authenticate = require('./middleware/auth');
  router = require('./routes/user');
  process.env.JWT_SECRET = 'test_secret';
} catch (err) {
  originalConsoleLog('__TEST_RESULTS_START__' + JSON.stringify([
    { test_id: 't1', description: 'Returns 401 when no token provided', passed: false, error: 'Load error: ' + err.message },
    { test_id: 't2', description: 'Returns 401 when token is malformed', passed: false },
    { test_id: 't3', description: 'Returns 401 when token is expired', passed: false },
    { test_id: 't4', description: 'Returns 200 and user data when token is valid', passed: false },
    { test_id: 't5', description: 'Does not crash on missing Authorization header', passed: false }
  ]) + '__TEST_RESULTS_END__');
  process.exit(0);
}

async function run() {
  // Test 1: Returns 401 when no token provided
  try {
    let status = null;
    const req = { headers: {} };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't1',
      description: 'Returns 401 when no token provided',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't1', description: 'Returns 401 when no token provided', passed: false });
  }

  // Test 2: Returns 401 when token is malformed
  try {
    let status = null;
    const req = { headers: { authorization: 'Bearer malformed_token' } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't2',
      description: 'Returns 401 when token is malformed',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't2', description: 'Returns 401 when token is malformed', passed: false });
  }

  // Test 3: Returns 401 when token is expired
  try {
    let status = null;
    const token = mockJwt.sign({ user: 'test' }, 'test_secret', { expiresIn: '-1s' });
    const req = { headers: { authorization: \`Bearer \${token}\` } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't3',
      description: 'Returns 401 when token is expired',
      passed: status === 401 && !nextCalled
    });
  } catch (err) {
    results.push({ test_id: 't3', description: 'Returns 401 when token is expired', passed: false });
  }

  // Test 4: Returns 200 and user data when token is valid
  try {
    let status = 200;
    const token = mockJwt.sign({ username: 'testuser' }, 'test_secret');
    const req = { headers: { authorization: \`Bearer \${token}\` } };
    let nextCalled = false;
    const res = {
      status: (s) => { status = s; return res; },
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => { nextCalled = true; });
    results.push({
      test_id: 't4',
      description: 'Returns 200 and user data when token is valid',
      passed: nextCalled && req.user && req.user.username === 'testuser'
    });
  } catch (err) {
    results.push({ test_id: 't4', description: 'Returns 200 and user data when token is valid', passed: false });
  }

  // Test 5: Does not crash on missing Authorization header
  try {
    const req = { headers: {} };
    const res = {
      status: () => res,
      json: () => res,
      send: () => res
    };
    authenticate(req, res, () => {});
    results.push({
      test_id: 't5',
      description: 'Does not crash on missing Authorization header',
      passed: true
    });
  } catch (err) {
    results.push({
      test_id: 't5',
      description: 'Does not crash on missing Authorization header',
      passed: false
    });
  }

  originalConsoleLog('__TEST_RESULTS_START__' + JSON.stringify(results) + '__TEST_RESULTS_END__');
}

run();
    `.trim();

    let testResults: any[] = [];
    let testsRunSuccessfully = false;

    // Try Piston first
    try {
      const pistonRes = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "javascript",
          version: "*",
          files: [
            { name: "index.js", content: testRunnerCode },
            { name: "middleware/auth.js", content: codebase["middleware/auth.js"] || "" },
            { name: "routes/user.js", content: codebase["routes/user.js"] || "" }
          ]
        })
      });

      if (pistonRes.ok) {
        const resData = await pistonRes.json();
        const stdout = resData.run?.stdout || "";
        const stderr = resData.run?.stderr || "";
        
        const match = stdout.match(/__TEST_RESULTS_START__(.*?)__TEST_RESULTS_END__/);
        if (match && match[1]) {
          testResults = JSON.parse(match[1]);
          testsRunSuccessfully = true;
        }
      }
    } catch (e) {
      console.warn("Piston Sandbox call failed, attempting local Node execution fallback:", e);
    }

    // Local Node execution fallback if Piston failed
    if (!testsRunSuccessfully) {
      console.log("Piston API is unavailable. Running local Node.js test execution fallback...");
      const tempDir = path.join(process.cwd(), "scratch", `run_${session_id}_${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      try {
        await fs.mkdir(path.join(tempDir, "middleware"), { recursive: true });
        await fs.mkdir(path.join(tempDir, "routes"), { recursive: true });
        
        await fs.writeFile(path.join(tempDir, "index.js"), testRunnerCode, "utf8");
        await fs.writeFile(path.join(tempDir, "middleware", "auth.js"), codebase["middleware/auth.js"] || "", "utf8");
        await fs.writeFile(path.join(tempDir, "routes", "user.js"), codebase["routes/user.js"] || "", "utf8");

        const { stdout, stderr } = await execAsync("node index.js", { cwd: tempDir, timeout: 5000 });
        const match = stdout.match(/__TEST_RESULTS_START__(.*?)__TEST_RESULTS_END__/);
        if (match && match[1]) {
          testResults = JSON.parse(match[1]);
          testsRunSuccessfully = true;
          console.log("Local fallback execution succeeded!");
        } else {
          throw new Error("Could not parse test results from output: " + (stderr || stdout));
        }
      } catch (localErr: any) {
        console.error("Local sandbox execution fallback failed:", localErr);
        testResults = challenge.hidden_tests.map((t: any) => ({
          test_id: t.id,
          description: t.description,
          passed: false,
          error: "Sandbox execution failed: " + localErr.message
        }));
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanErr) {
          console.error("Error cleaning up local sandbox files:", cleanErr);
        }
      }
    }

    // 3. Conversation Scoring (Groq Call)
    const apiKey = process.env.INTERVIEW_GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "INTERVIEW_GROQ_API_KEY not configured. Please set it in .env.local" }, { status: 500 });
    }

    const evaluationSystemPrompt = `You are an expert technical interviewer evaluating a candidate's performance in an agentic coding interview. The candidate was given a real engineering problem and had to direct an AI coding agent to solve it. You are NOT evaluating the AI agent — you are evaluating how effectively the candidate used the agent.

Analyze the conversation history below and score the candidate on each category from 0 to 10.

Scoring rubric:
- prompt_engineering (0-10): Were their prompts to the agent precise, clear, and well-scoped? Did they iterate effectively when the agent misunderstood?
- problem_decomposition (0-10): Did they break the problem into logical steps rather than asking the agent to "just fix everything"?
- context_management (0-10): Did they provide relevant context, reference specific files or lines, and build on previous responses?
- debugging_ability (0-10): Did they identify root causes or just describe symptoms? Did they push back when the agent's fix was wrong?
- testing_strategy (0-10): Did they ask about edge cases, error states, or test coverage?
- code_review_quality (0-10): Did they critically evaluate the agent's proposed changes before accepting? Did they ask for explanations?
- security_awareness (0-10): Did they consider security implications of the bug or the fix?

overall_score (0-100): Weighted average, with debugging_ability and code_review_quality weighted 1.5x.

Respond ONLY with valid JSON, no extra text, no markdown:
{
  "scores": {
    "prompt_engineering": 0,
    "problem_decomposition": 0,
    "context_management": 0,
    "debugging_ability": 0,
    "testing_strategy": 0,
    "code_review_quality": 0,
    "security_awareness": 0
  },
  "overall_score": 0,
  "strengths": ["specific strength with evidence from the conversation"],
  "weaknesses": ["specific weakness with evidence from the conversation"],
  "hiring_recommendation": "Strong Hire",
  "recommendation_reasoning": "2-3 sentence explanation referencing specific moments in the interview"
}`;

    const conversationText = JSON.stringify(session.conversation || [], null, 2);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: evaluationSystemPrompt },
          { role: "user", content: `Here is the full interview conversation:\n\n${conversationText}` }
        ],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq evaluation error:", errorText);
      throw new Error(`Groq scoring API error: ${errorText}`);
    }

    const groqData = await groqRes.json();
    const rawEval = groqData.choices?.[0]?.message?.content || "";
    const cleanedEval = cleanJsonResponseText(rawEval);

    let parsedEval: any;
    try {
      parsedEval = JSON.parse(cleanedEval);
    } catch (e) {
      console.error("Failed to parse evaluation response as JSON:", rawEval);
      // Fallback evaluation structure if parsing fails
      parsedEval = {
        scores: {
          prompt_engineering: 5,
          problem_decomposition: 5,
          context_management: 5,
          debugging_ability: 5,
          testing_strategy: 5,
          code_review_quality: 5,
          security_awareness: 5
        },
        overall_score: 50,
        strengths: ["Submitted solution on time"],
        weaknesses: ["Parsing AI grader output failed"],
        hiring_recommendation: "No Hire",
        recommendation_reasoning: "Grading system returned invalid output structure. Manual review required."
      };
    }

    // 4. Save report and update status
    const report = await createReport({
      session_id,
      user_id: session.user_id,
      scores: parsedEval.scores,
      strengths: parsedEval.strengths,
      weaknesses: parsedEval.weaknesses,
      hiring_recommendation: parsedEval.hiring_recommendation,
      recommendation_reasoning: parsedEval.recommendation_reasoning,
      overall_score: parsedEval.overall_score,
      test_results: testResults
    });

    await updateSession(session_id, {
      status: "evaluated"
    });

    return NextResponse.json({ report_id: report.id });
  } catch (err: any) {
    console.error("Error submitting solution:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
