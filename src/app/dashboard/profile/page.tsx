import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DEFAULT_BADGES } from "@/lib/badgesData"
import ProfileContent, { type GitHubAnalysisData as GitHubAnalysisDataForProfile } from "./profile-content"
import { readLocalCache } from "@/lib/localCache"
import type { GithubAnalysisRow, BadgeRow, UserBadgeRow } from "@/types/db"

interface DisplayInterview {
  id: string
  category: string
  score: number
  date: string
  status: string
}

interface BadgeMeta {
  slug: string
  name: string
  description: string
  category: string
  icon: string
  rarity: string
}

interface ActiveUser {
  id?: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const hasDemoCookie = cookieStore.has("mockmate-demo-session")

  let activeUser: ActiveUser | null = null
  let userId: string | null = null

  const isDemoMode = hasDemoCookie

  if (isDemoMode) {
    const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
    if (demoUserCookie) {
      try {
        const parsed = JSON.parse(demoUserCookie)
        activeUser = {
          name: parsed.username || parsed.email?.split("@")[0] || "User",
          email: parsed.email,
          avatar_url: parsed.avatar_url,
        }
      } catch {
        // fallback
      }
    }
    if (!activeUser) {
      activeUser = {
        name: "Guest User",
        email: "guest@almaprep.com",
        avatar_url: "user-tie",
      }
    }
    userId = "demo-user-id"
  } else {
    activeUser = session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email, avatar_url: session.user.image } : null
    userId = session?.user?.id ?? null
  }

  const supabase = isDemoMode ? null : await createClient()

  if (!isDemoMode && supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        activeUser = { id: data.user.id, email: data.user.email }
        userId = data.user.id
      }
    } catch (err) {
      console.error("ProfilePage: Failed to fetch Supabase user:", err)
    }
  }

  if (!activeUser || !userId) {
    redirect("/login")
  }

  let initialProfile: { username: string; avatar_url: string; resume_text: string; github_autosave: boolean; current_streak?: number; longest_streak?: number } = {
    username: "User",
    avatar_url: "user-tie",
    resume_text: "",
    github_autosave: false
  }
  let userEmail = activeUser.email || ""
  let createdAt = new Date().toISOString()
  let interviews: DisplayInterview[] = []
  let subscriptionTier = "free"
  let githubAnalysis: GithubAnalysisRow | null = null

  if (isDemoMode) {
    let resumeText = ""
    const customResume = cookieStore.get("mockmate-demo-resume")?.value
    if (customResume) {
      try {
        const parsed = JSON.parse(customResume)
        resumeText = parsed.resumeText || resumeText
      } catch {}
    }

    initialProfile = {
      username: activeUser.name || "Guest",
      avatar_url: activeUser.avatar_url || "user-tie",
      resume_text: resumeText,
      github_autosave: false,
    }
    createdAt = new Date().toISOString()
    subscriptionTier = "free"
    interviews = []
  } else {
    if (!supabase) redirect("/login")
    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (!profile) {
      redirect("/onboarding")
    }

    initialProfile = {
      username: profile.username || activeUser.name || activeUser.email?.split("@")[0] || "User",
      avatar_url: profile.avatar_url || "user-tie",
      resume_text: profile.resume_text || "",
      github_autosave: !!profile.github_autosave,
      current_streak: profile.current_streak || 0,
      longest_streak: profile.longest_streak || 0
    }
    userEmail = activeUser.email || ""
    createdAt = profile.created_at || new Date().toISOString()
    subscriptionTier = profile.subscription_tier || "free"

    try {
      const { data: cached, error } = await supabase
        .from("github_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle() as unknown as { data: GithubAnalysisRow | null; error: { message: string } | null }

      if (error || !cached) {
        githubAnalysis = readLocalCache("github_analysis", userId) as unknown as GithubAnalysisRow | null
      } else {
        githubAnalysis = cached
      }
    } catch (e) {
      console.error("Failed to fetch cached github analysis, checking local cache:", e)
      githubAnalysis = readLocalCache("github_analysis", userId) as unknown as GithubAnalysisRow | null
    }

    // 2. Fetch interviews and feedback
    const { data: interviewsData } = await supabase
      .from("interviews")
      .select(`
        id,
        category,
        status,
        created_at,
        feedback (
          score
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (interviewsData) {
      interviews = (interviewsData as unknown as Array<{ id: string; category: string; status: string; created_at: string; feedback: { score: number }[] }>).map((item) => {
        const score = item.feedback && item.feedback[0] ? item.feedback[0].score : 75
        return {
          id: item.id,
          category: item.category,
          score,
          date: item.created_at,
          status: item.status,
        }
      })
    }
  }

  let allBadges: BadgeMeta[] = []
  let userBadges: UserBadgeRow[] = []
  let totalActivities = interviews.length

  if (!isDemoMode && supabase && userId) {
    // Fetch all badges
    const { data: badgesData } = await supabase.from("badges").select("*") as unknown as { data: BadgeRow[] | null }
    if (badgesData) allBadges = badgesData

    // Fetch user's earned badges
    const { data: earnedBadgesData } = await supabase.from("user_badges").select("*").eq("user_id", userId) as unknown as { data: UserBadgeRow[] | null }
    if (earnedBadgesData) userBadges = earnedBadgesData
    
    // Add coding sessions to total activities
    const { count } = await supabase.from("interview_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId).in("status", ["completed", "evaluated"])
    if (count) totalActivities += count
  }

  // If badges table wasn't seeded or user is in demo mode, fallback to hardcoded list so they are still visible
  if (allBadges.length === 0) {
    allBadges = DEFAULT_BADGES
  }

  const hasGitHubToken = cookieStore.has("sb-github-provider-token")

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-8 pb-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-head), serif", letterSpacing: "-0.015em", fontWeight: 600 }}>
            My Profile
          </h1>
        </div>

        <ProfileContent
          initialProfile={initialProfile}
          userEmail={userEmail}
          createdAt={createdAt}
          interviews={interviews}
          subscriptionTier={subscriptionTier}
          hasGitHubToken={hasGitHubToken}
          initialGitHubAnalysis={githubAnalysis as unknown as GitHubAnalysisDataForProfile}
          allBadges={allBadges}
          userBadges={userBadges}
          totalActivities={totalActivities}
        />
      </div>
    </main>
  )
}
