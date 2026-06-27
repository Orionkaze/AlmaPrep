interface GitHubRepo {
  name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  updated_at: string;
}

interface FetchRepoDetailsResult {
  name: string;
  languages: string[];
  readme: string;
  commits: string[];
}

/**
 * Fetches the user's top 5 repositories sorted by most recently updated,
 * along with their tech stack, README content, and recent commit messages.
 * 
 * @param accessToken The GitHub OAuth access token from Supabase session
 */
export async function fetchGitHubUserData(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "MockMate-App",
  };

  // 1. Fetch user profile to get their username
  let username = "GitHub User";
  try {
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData.login || username;
    }
  } catch (err) {
    console.error("Error fetching GitHub user profile:", err);
  }

  // 2. Fetch top 5 recently updated repos
  const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=5", { headers });
  if (!reposRes.ok) {
    const errorText = await reposRes.text();
    throw new Error(`Failed to fetch repositories from GitHub (Status ${reposRes.status}): ${errorText}`);
  }

  const repos: GitHubRepo[] = await reposRes.json();
  const repoDetails: FetchRepoDetailsResult[] = [];

  // 3. For each repo, fetch additional details in parallel
  await Promise.all(
    repos.map(async (repo) => {
      const ownerName = repo.owner.login;
      const repoName = repo.name;

      // Initialize default values
      let languages: string[] = [];
      let readme = "";
      let commits: string[] = [];

      // Fetch languages used
      try {
        const langRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/languages`, { headers });
        if (langRes.ok) {
          const langData = await langRes.json();
          languages = Object.keys(langData);
        }
      } catch (err) {
        console.error(`Error fetching languages for ${repoName}:`, err);
      }

      // Fetch README content
      try {
        const readmeRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/readme`, { headers });
        if (readmeRes.ok) {
          const readmeData = await readmeRes.json();
          if (readmeData.content && readmeData.encoding === "base64") {
            readme = Buffer.from(readmeData.content, "base64").toString("utf8");
          }
        }
      } catch (err) {
        console.error(`Error fetching README for ${repoName}:`, err);
      }

      // Fetch top 5 commits
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/commits?per_page=5`, { headers });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          if (Array.isArray(commitsData)) {
            commits = commitsData.map((c: any) => c.commit?.message || "").filter(Boolean);
          }
        }
      } catch (err) {
        console.error(`Error fetching commits for ${repoName}:`, err);
      }

      repoDetails.push({
        name: repoName,
        languages,
        readme: readme.substring(0, 10000), // Limit README size to avoid token overflow in LLM
        commits,
      });
    })
  );

  return {
    username,
    repositories: repoDetails,
  };
}

import { callGroqJson, cleanJsonResponseText } from "./llm";

/**
 * Sends repository data (tech stack, READMEs, commits) to Groq to generate
 * developer profile details and a set of tailored technical and behavioral interview questions.
 * 
 * @param username The GitHub username
 * @param repositories The fetched repositories list with READMEs, languages, and commits
 */
export async function analyzeGitHubProfile(username: string, repositories: FetchRepoDetailsResult[]) {
  const systemPrompt = `You are an expert technical interviewer and engineering manager.
Analyze the provided developer's GitHub repositories (languages, READMEs, commits) to generate:
1. A developer profile / coding strengths summary (profile_summary).
2. A unified list of technologies used (tech_stack).
3. A list of analyzed repository names (repos_analyzed).
4. A list of 3-5 key coding/workflow strengths (strengths).
5. EXACTLY 3 tailored interview questions for EACH repository: 1 easy, 1 medium, 1 hard.

Guidelines for Questions:
- Generate a mix of technical concepts (e.g. system design, specific API choices, database, algorithms) and behavioral/workflow questions based on their commits (e.g. migration, refactoring, code quality, libraries).
- Easy: Checks basic usage, conventions, or what the project does.
- Medium: Focuses on architectural choices, trade-offs, debugging, or workflow decisions.
- Hard: Deep dive into performance, security, edge cases, scaling, or significant refactoring.

You MUST respond with a single valid JSON object following this EXACT format:
{
  "username": "${username}",
  "profile_summary": "string",
  "tech_stack": ["string"],
  "repos_analyzed": ["string"],
  "strengths": ["string"],
  "questions": [
    { "repo": "repo_name", "question": "question text", "difficulty": "easy" },
    { "repo": "repo_name", "question": "question text", "difficulty": "medium" },
    { "repo": "repo_name", "question": "question text", "difficulty": "hard" }
  ]
}
Do not include any code block formatting like \`\`\`json or markdown outside of the JSON. Just output pure JSON.`;

  const userPrompt = `Here is the GitHub repository data for developer "${username}":

${repositories.map((repo, idx) => `
---
Repository #${idx + 1}: ${repo.name}
Languages: ${repo.languages.join(", ") || "None listed"}
README Content Snippet:
${repo.readme ? repo.readme.substring(0, 4000) : "No README available"}

Recent Commits:
${repo.commits.length > 0 ? repo.commits.map(c => `- ${c}`).join("\n") : "No commit history found"}
`).join("\n")}`;

  try {
    const rawResult = await callGroqJson(systemPrompt, userPrompt, 0.7);
    const cleaned = cleanJsonResponseText(rawResult);
    const result = JSON.parse(cleaned);
    return result;
  } catch (err) {
    console.error("Error running Groq analysis on GitHub data:", err);
    throw new Error(`Groq Analysis Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
