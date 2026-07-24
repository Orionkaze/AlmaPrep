import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getResumeData } from "@/app/actions/resume"
import ResumeContent from "./resume-content"

export default async function ResumePage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const hasDemoCookie = cookieStore.has("mockmate-demo-session")
  
  let supabaseUser = null
  let activeUser = null

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
  } else {
    activeUser = session?.user
  }

  const supabase = isDemoMode ? null : await createClient()

  if (!isDemoMode && supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      supabaseUser = data?.user || null
      if (supabaseUser) {
        activeUser = supabaseUser
      }
    } catch (err) {
      console.error("ResumePage: Failed to fetch Supabase user:", err)
    }
  }

  if (!activeUser) {
    redirect("/login")
  }

  // Fetch saved resume data
  let resumeText = ""
  let analysis = null

  const result = await getResumeData()
  if (result.success && result.data) {
    resumeText = result.data.resumeText
    analysis = result.data.analysis
  }

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-8 pb-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-head), serif", letterSpacing: "-0.015em", fontWeight: 600 }}>
            Resume Analyzer
          </h1>
        </div>

        <ResumeContent initialResumeText={resumeText} initialAnalysis={analysis} />
      </div>
    </main>
  )
}
