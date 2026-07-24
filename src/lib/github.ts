interface GitHubRepo {
  name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  updated_at: string;
  default_branch?: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
}

interface GitHubPullRequest {
  title?: string;
}

interface GitHubIssue {
  title?: string;
  pull_request?: unknown;
}

interface GitHubCommit {
  commit?: { message?: string };
}

interface FetchRepoDetailsResult {
  name: string;
  languages: string[];
  readme: string;
  commits: string[];
  fileStructure: string[];
  dependencies: string;
  closedPRs: string[];
  closedIssues: string[];
  commitsPerWeek: number;
}

/**
 * Fetches the user's top 5 repositories sorted by most recently updated,
 * along with deep analysis signals: README, languages, top-level file structure,
 * package dependencies, closed PRs & issues, and commit frequency.
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
      const defaultBranch = repo.default_branch || "main";

      // Initialize default values
      let languages: string[] = [];
      let readme = "";
      let commits: string[] = [];
      let fileStructure: string[] = [];
      let dependencies = "";
      let closedPRs: string[] = [];
      let closedIssues: string[] = [];
      let commitsPerWeek = 0;

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

      // Fetch top-level file structure via Trees API
      try {
        const treeRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/git/trees/${defaultBranch}`, { headers });
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          if (treeData && Array.isArray(treeData.tree)) {
            fileStructure = treeData.tree.map((item: GitHubTreeItem) => `${item.type === "tree" ? "[DIR] " : ""}${item.path}`);
          }
        } else {
          // Fallback to master if default branch check fails
          const fallbackRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/git/trees/master`, { headers });
          if (fallbackRes.ok) {
            const treeData = await fallbackRes.json();
            if (treeData && Array.isArray(treeData.tree)) {
              fileStructure = treeData.tree.map((item: GitHubTreeItem) => `${item.type === "tree" ? "[DIR] " : ""}${item.path}`);
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching file tree for ${repoName}:`, err);
      }

      // Fetch package dependencies
      const depFilesToCheck = ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml"];
      const filesInRoot = fileStructure.map(f => f.replace("[DIR] ", ""));
      const depFileToFetch = depFilesToCheck.find(f => filesInRoot.includes(f));

      if (depFileToFetch) {
        try {
          const depRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/contents/${depFileToFetch}`, { headers });
          if (depRes.ok) {
            const depData = await depRes.json();
            if (depData.content && depData.encoding === "base64") {
              const decoded = Buffer.from(depData.content, "base64").toString("utf8");
              if (depFileToFetch === "package.json") {
                try {
                  const pkg = JSON.parse(decoded);
                  const deps = Object.keys(pkg.dependencies || {});
                  const devDeps = Object.keys(pkg.devDependencies || {});
                  dependencies = `package.json dependencies: ${deps.join(", ")}; devDependencies: ${devDeps.join(", ")}`;
                } catch {
                  dependencies = decoded.substring(0, 1000);
                }
              } else {
                dependencies = `${depFileToFetch} contents:\n${decoded.substring(0, 1000)}`;
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching dependency file for ${repoName}:`, err);
        }
      }

      // Fetch last 5 closed PRs
      try {
        const prRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/pulls?state=closed&per_page=5`, { headers });
        if (prRes.ok) {
          const prData = await prRes.json();
          if (Array.isArray(prData)) {
            closedPRs = prData.map((pr: GitHubPullRequest) => pr.title || "");
          }
        }
      } catch (err) {
        console.error(`Error fetching PRs for ${repoName}:`, err);
      }

      // Fetch last 5 closed Issues (excluding PRs)
      try {
        const issueRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/issues?state=closed&per_page=15`, { headers });
        if (issueRes.ok) {
          const issueData = await issueRes.json();
          if (Array.isArray(issueData)) {
            closedIssues = issueData
              .filter((issue: GitHubIssue) => !issue.pull_request)
              .slice(0, 5)
              .map((issue: GitHubIssue) => issue.title || "");
          }
        }
      } catch (err) {
        console.error(`Error fetching issues for ${repoName}:`, err);
      }

      // Fetch commits from last 3 months to calculate commits per week
      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const commitsRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/commits?since=${threeMonthsAgo.toISOString()}&per_page=100`, { headers });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          if (Array.isArray(commitsData)) {
            commitsPerWeek = parseFloat((commitsData.length / 12).toFixed(2));
          }
        }
      } catch (err) {
        console.error(`Error fetching commits for frequency calculation in ${repoName}:`, err);
      }

      // Fetch top 5 recent commits (for questions/reference)
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${ownerName}/${repoName}/commits?per_page=5`, { headers });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          if (Array.isArray(commitsData)) {
            commits = commitsData.map((c: GitHubCommit) => c.commit?.message || "").filter(Boolean);
          }
        }
      } catch (err) {
        console.error(`Error fetching recent commits for ${repoName}:`, err);
      }

      repoDetails.push({
        name: repoName,
        languages,
        readme: readme.substring(0, 10000), // Limit README size
        commits,
        fileStructure,
        dependencies,
        closedPRs,
        closedIssues,
        commitsPerWeek,
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
 * Sends detailed repository data (tech stack, READMEs, commits, tree structure,
 * package dependencies, PRs, issues, commits per week) to Groq to generate
 * developer profile details, design patterns, weak areas, complexity scores,
 * and a set of tailored easy/medium/hard questions per repository.
 * 
 * @param username The GitHub username
 * @param repositories The fetched repositories list with rich architectural signals
 */
export async function analyzeGitHubProfile(username: string, repositories: FetchRepoDetailsResult[]) {
  const systemPrompt = `You are an expert technical interviewer, system architect, and engineering manager.
Analyze the provided developer's GitHub repositories with rich architectural signals (languages, READMEs, commit messages, top-level directory structure, package dependencies, closed PRs/issues, and commit frequency) to generate a detailed developer profile:

1. profile_summary: A specific, non-generic summary mentioning actual frameworks, patterns, and architecture choices detected (e.g., MVC, monorepos, microservices).
2. tech_stack: A list of technologies/libraries used across their projects.
3. design_patterns: A list of global design patterns detected (e.g., "REST API Design", "Event-Driven", "Component-Based Architecture").
4. strengths: A list of 3-5 developer strengths.
5. weak_areas: A list of weak areas to improve based on missing items (e.g., "No tests detected", "No CI/CD configuration", "Lacks API documentation").
6. repo_metadata: An object mapping repository names to their metadata:
   - complexity_score: A score from 1-10 based on dependency count, file structure depth, and PR activity.
   - design_patterns: Design patterns specific to this repository.
   - weak_areas: Weak areas specific to this repository.
7. questions: EXACTLY 3 tailored interview questions for EACH repository (1 easy, 1 medium, 1 hard) that mix technical design, implementation details, and workflow/collaboration based on actual repository contents.

You MUST respond with a single valid JSON object following this EXACT schema:
{
  "username": "${username}",
  "profile_summary": "string",
  "tech_stack": ["string"],
  "design_patterns": ["string"],
  "strengths": ["string"],
  "weak_areas": ["string"],
  "repo_metadata": {
    "repo_name": {
      "complexity_score": 7,
      "design_patterns": ["string"],
      "weak_areas": ["string"]
    }
  },
  "questions": [
    { "repo": "repo_name", "question": "question text", "difficulty": "easy" },
    { "repo": "repo_name", "question": "question text", "difficulty": "medium" },
    { "repo": "repo_name", "question": "question text", "difficulty": "hard" }
  ]
}
Do not include any code block formatting like \`\`\`json or markdown outside of the JSON. Just output pure JSON.`;

  const userPrompt = `Here is the rich GitHub repository data for developer "${username}":

${repositories.map((repo, idx) => `
---
Repository #${idx + 1}: ${repo.name}
Languages: ${repo.languages.join(", ") || "None listed"}
Commit Frequency: ${repo.commitsPerWeek} commits/week over last 3 months
Top-level File Structure:
${repo.fileStructure.length > 0 ? repo.fileStructure.map(f => `- ${f}`).join("\n") : "Empty or failed to retrieve"}
Dependencies Detected:
${repo.dependencies || "No dependency files found"}
Closed Pull Requests (Last 5):
${repo.closedPRs.length > 0 ? repo.closedPRs.map(pr => `- ${pr}`).join("\n") : "No PR history"}
Closed Issues (Last 5):
${repo.closedIssues.length > 0 ? repo.closedIssues.map(issue => `- ${issue}`).join("\n") : "No issue history"}
Recent Commit Messages:
${repo.commits.length > 0 ? repo.commits.map(c => `- ${c}`).join("\n") : "No recent commits"}
README Content Snippet:
${repo.readme ? repo.readme.substring(0, 4000) : "No README available"}
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
