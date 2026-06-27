import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { fetchGitHubUserData, analyzeGitHubProfile } from "@/lib/github"

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    let userId = (session?.user as any)?.id
    let userEmail = session?.user?.email

    // Fallback: If no NextAuth session, check Supabase auth
    const supabase = await createClient()
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        userEmail = user.email
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Extract GitHub provider token from cookie
    const cookieStore = await cookies()
    const providerToken = cookieStore.get("sb-github-provider-token")?.value

    if (!providerToken) {
      return NextResponse.json(
        { error: "GitHub account is not connected. Please connect with GitHub to run the analysis." },
        { status: 400 }
      )
    }

    // 3. Extract request body options
    const body = await req.json().catch(() => ({}))
    const forceRefresh = body.forceRefresh === true

    // 4. Check for cached analysis if not forcing refresh
    if (!forceRefresh) {
      const { data: cached, error: cachedError } = await supabase
        .from("github_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (cached && !cachedError) {
        return NextResponse.json({ result: cached, cached: true })
      }
    }

    // 5. Fetch repo data using GitHub REST API
    const githubData = await fetchGitHubUserData(providerToken)

    if (!githubData.repositories || githubData.repositories.length === 0) {
      return NextResponse.json(
        { error: "No repositories found for this GitHub account." },
        { status: 400 }
      )
    }

    // 6. Run Groq LLM Analysis on fetched data
    const analysis = await analyzeGitHubProfile(githubData.username, githubData.repositories)

    // 7. Store/Cache result in Supabase github_analysis table
    const analysisRecord = {
      user_id: userId,
      profile_summary: analysis.profile_summary,
      tech_stack: analysis.tech_stack,
      strengths: analysis.strengths,
      questions: analysis.questions,
      created_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from("github_analysis")
      .upsert(analysisRecord)

    if (upsertError) {
      console.error("[api/github-analysis] Failed to store GitHub analysis in database:", upsertError.message)
    }

    return NextResponse.json({ result: analysisRecord, cached: false })
  } catch (error: any) {
    console.error("[api/github-analysis] Error in POST route:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
