import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import ProfileContent from "./profile-content"
import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"

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
  let activeUser = session?.user as any
  let userId = (session?.user as any)?.id

  let isDemoMode = false
  if (!activeUser && hasDemoCookie) {
    isDemoMode = true
    activeUser = {
      name: "Straw Hat Luffy",
      email: "luffy@goingmerry.org",
    }
    userId = "demo-user-id"
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

  let initialProfile = { username: "User", avatar_url: "user-tie", resume_text: "" }
  let userEmail = activeUser.email || ""
  let createdAt = new Date().toISOString()
  let interviews: any[] = []
  let subscriptionTier = "free"

  if (isDemoMode) {
    initialProfile = {
      username: "Luffy (Demo)",
      avatar_url: "rocket",
      resume_text: "Objective: Find the One Piece. Experience: Captain of the Straw Hat Pirates. Defeated Kaido, Big Mom, Doflamingo. Skills: Gear 5, Conqueror's Haki, Elasticity, leadership, meat eating.",
    }
    createdAt = new Date(Date.now() - 365*24*60*60*1000).toISOString()
    subscriptionTier = "premium"
    interviews = mockHistory.map(item => ({
      id: item.id,
      category: item.category,
      score: item.score,
      date: item.date,
      status: item.status
    }))
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
    }
    userEmail = activeUser.email || ""
    createdAt = profile.created_at || new Date().toISOString()
    subscriptionTier = profile.subscription_tier || "free"

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
      interviews = interviewsData.map((item) => {
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

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors">
              ← Dashboard
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              My Profile
            </h1>
          </div>
          <LogoutButton />
        </div>

        <ProfileContent
          initialProfile={initialProfile}
          userEmail={userEmail}
          createdAt={createdAt}
          interviews={interviews}
          subscriptionTier={subscriptionTier}
        />
      </div>
    </main>
  )
}
