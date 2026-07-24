import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { getResumeData } from "@/app/actions/resume"
import ResumeContent from "./resume-content"

export default async function ResumePage() {
  const user = await getCurrentUser()
  const isDemoMode = user.isDemo
  const userId = user.userId

  if (!userId) {
    redirect("/login")
  }

  const activeUser = {
    name: user.username || user.email?.split("@")[0] || "User",
    email: user.email || "guest@almaprep.com",
    avatar_url: user.avatarUrl || "user-tie",
  }

  const supabase = isDemoMode ? null : await createClient()

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
