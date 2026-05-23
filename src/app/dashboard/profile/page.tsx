import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const isDemo = cookieStore.get("mockmate-demo-session")?.value === "true"

  let initialProfile = { username: "Guest User", avatar_url: "user-tie", resume_text: "" }
  let userEmail = "guest@mockmate.demo"
  let createdAt = new Date().toISOString()
  let interviews = mockHistory

  if (user) {
    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile) {
      redirect("/onboarding")
    }

    initialProfile = {
      username: profile.username || user.email?.split("@")[0] || "User",
      avatar_url: profile.avatar_url || "user-tie",
      resume_text: profile.resume_text || "",
    }
    userEmail = user.email || ""
    createdAt = user.created_at || profile.created_at || new Date().toISOString()

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
      .eq("user_id", user.id)
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
  } else if (!isDemo) {
    redirect("/login")
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
        />
      </div>
    </main>
  )
}
