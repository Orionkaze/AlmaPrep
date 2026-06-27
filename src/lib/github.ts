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
