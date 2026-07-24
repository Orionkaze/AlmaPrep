import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionById, getChallengeById } from "@/lib/interviewDb";
import { isRateLimited } from "@/lib/rateLimit";

async function commitFileToRepo(owner: string, repo: string, filePath: string, content: string, token: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Initial commit: add ${filePath}`,
      content: Buffer.from(content).toString("base64")
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to commit file ${filePath} to repo: ${errorText}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { session_id, repo_name, is_private, always_save } = body;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (await isRateLimited(`github-save:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    // 1. Get GitHub OAuth provider token from cookies
    const cookieStore = await cookies();
    const githubToken = cookieStore.get("sb-github-provider-token")?.value;

    if (!githubToken) {
      return NextResponse.json({
        error: "GitHub account is not connected. Please log out and sign in with GitHub to link your account."
      }, { status: 403 });
    }

    // 2. Fetch session and challenge data using localDb-aware helpers
    const session = await getSessionById(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const challenge = await getChallengeById(session.challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const codebase = session.current_codebase || {};
    const firstFileKey = Object.keys(codebase)[0] || "solution.js";
    const userCode = codebase[firstFileKey] || "";
    const challengeSlug = challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const lang = challenge.language || "javascript";
    const ext = lang === "python" ? "py" : lang === "typescript" ? "ts" : "js";

    // 3. Generate README.md via Groq
    const apiKey = process.env.INTERVIEW_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "INTERVIEW_GROQ_API_KEY not configured" }, { status: 500 });
    }
    const model = process.env.GROQ_CODING_MODEL || process.env.GROQ_MODEL || "qwen3.6-2.7b";

    const readmePrompt = `You are a senior technical writer. Create a professional, portfolio-grade README.md for a GitHub repository that contains the solution to a coding challenge.
Make it detailed, well-structured, and rich. Focus on explanation, approach, and code structure. Do not use generic template placeholders.

Challenge Title: ${challenge.title}
Challenge Description:
${challenge.description}

User's Solution Code (in ${lang}):
\`\`\`${lang}
${userCode}
\`\`\`

Test Cases:
${JSON.stringify(challenge.hidden_tests, null, 2)}

Provide the complete README.md content. Respond with ONLY the markdown content, no JSON, no explanations.`;

    const readmeRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: readmePrompt }],
        max_tokens: 1536,
        temperature: 0.2
      })
    });

    let readmeContent = "";
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      readmeContent = readmeData.choices?.[0]?.message?.content || "";
    } else {
      // Fallback README
      readmeContent = `# Almaprep Solutions - ${challenge.title}\n\nThis repository contains a successful solution for the ${challenge.title} challenge.\n\n## Description\n${challenge.description}\n\n## Solution\nImplemented in ${lang}.`;
    }

    // 4. Retrieve Github username
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Failed to fetch GitHub profile to determine username" }, { status: userRes.status });
    }

    const userProfile = await userRes.json();
    const ownerName = userProfile.login;

    // 5. Create Repository on GitHub (handling name collisions)
    let targetRepoName = repo_name || `almaprep-${challengeSlug}-solution`;
    // Sanitize repo name
    targetRepoName = targetRepoName.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");

    let createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: targetRepoName,
        private: !!is_private,
        description: `Solution for ${challenge.title} on Almaprep`,
        auto_init: false
      })
    });

    if (createRes.status === 422) {
      // Name collision, try appending date string
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      targetRepoName = `${targetRepoName}-${dateStr}`;

      createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: targetRepoName,
          private: !!is_private,
          description: `Solution for ${challenge.title} on Almaprep`,
          auto_init: false
        })
      });

      if (createRes.status === 422) {
        // Still colliding, use timestamp
        targetRepoName = `${targetRepoName}-${Date.now()}`;
        createRes = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: targetRepoName,
            private: !!is_private,
            description: `Solution for ${challenge.title} on Almaprep`,
            auto_init: false
          })
        });
      }
    }

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      return NextResponse.json({ error: `GitHub Repository creation failed: ${errTxt}` }, { status: createRes.status });
    }

    const repoData = await createRes.json();
    const repoUrl = repoData.html_url;

    // 6. Commit files using Contents API
    await commitFileToRepo(ownerName, targetRepoName, `solution.${ext}`, userCode, githubToken);
    await commitFileToRepo(ownerName, targetRepoName, "README.md", readmeContent, githubToken);
    await commitFileToRepo(ownerName, targetRepoName, "test_cases.json", JSON.stringify(challenge.hidden_tests, null, 2), githubToken);

    // 7. Update Supabase coding_solutions URL
    await supabase
      .from("coding_solutions")
      .update({
        github_repo_url: repoUrl,
        github_repo_name: targetRepoName
      })
      .eq("user_id", user.id)
      .eq("challenge_id", challenge.id);

    // 8. If always_save setting checked, toggle setting
    if (always_save) {
      await supabase
        .from("users")
        .update({ github_autosave: true })
        .eq("id", user.id);
    }

    return NextResponse.json({ repo_url: repoUrl, repo_name: targetRepoName });

  } catch (err) {
    console.error("Error in github save API route:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
