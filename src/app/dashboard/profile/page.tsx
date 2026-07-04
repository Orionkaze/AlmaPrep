import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import ProfileContent from "./profile-content"
import { readLocalCache } from "@/lib/localCache"

// Mock data for demo fallback
const mockHistory = [
  { id: "1", category: "technical", score: 82, date: "2026-05-19T12:00:00Z", status: "completed" },
  { id: "2", category: "hr", score: 91, date: "2026-05-17T14:30:00Z", status: "completed" },
  { id: "3", category: "mixed", score: 76, date: "2026-05-14T09:15:00Z", status: "completed" },
]

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const hasDemoCookie = cookieStore.has("mockmate-demo-session")
  
  let supabaseUser = null
  let activeUser = null
  let userId = null

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
      } catch (err) {
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
    activeUser = session?.user as any
    userId = (session?.user as any)?.id
  }

  const supabase = isDemoMode ? null : await createClient()

  if (!isDemoMode && supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      supabaseUser = data?.user || null
      if (supabaseUser) {
        activeUser = supabaseUser
        userId = supabaseUser.id
      }
    } catch (err) {
      console.error("ProfilePage: Failed to fetch Supabase user:", err)
    }
  }

  if (!activeUser || !userId) {
    redirect("/login")
  }

  let initialProfile: { username: string; avatar_url: string; resume_text: string; github_autosave: boolean } = {
    username: "User",
    avatar_url: "user-tie",
    resume_text: "",
    github_autosave: false
  }
  let userEmail = activeUser.email || ""
  let createdAt = new Date().toISOString()
  let interviews: any[] = []
  let subscriptionTier = "free"
  let githubAnalysis: any = null

  if (isDemoMode) {
    let resumeText = ""
    const customResume = cookieStore.get("mockmate-demo-resume")?.value
    if (customResume) {
      try {
        const parsed = JSON.parse(customResume)
        resumeText = parsed.resumeText || resumeText
      } catch (e) {}
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
    }
    userEmail = activeUser.email || ""
    createdAt = profile.created_at || new Date().toISOString()
    subscriptionTier = profile.subscription_tier || "free"

    try {
      const { data: cached, error } = await supabase
        .from("github_analysis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()
      
      if (error || !cached) {
        githubAnalysis = readLocalCache("github_analysis", userId)
      } else {
        githubAnalysis = cached
      }
    } catch (e) {
      console.error("Failed to fetch cached github analysis, checking local cache:", e)
      githubAnalysis = readLocalCache("github_analysis", userId)
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
      interviews = (interviewsData as any[]).map((item: any) => {
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
          initialGitHubAnalysis={githubAnalysis}
        />
      </div>
    </main>
  )
}
