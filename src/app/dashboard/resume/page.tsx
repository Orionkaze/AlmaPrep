import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getResumeData } from "@/app/actions/resume"
import ResumeContent from "./resume-content"
import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"

export default async function ResumePage() {
  const session = await getServerSession(authOptions)
  const supabase = await createClient()
  
  // Try getting Supabase user, handling network issues gracefully
  let supabaseUser = null
  try {
    const { data } = await supabase.auth.getUser()
    supabaseUser = data?.user || null
  } catch (err) {
    console.error("ResumePage: Failed to fetch Supabase user:", err)
  }

  const cookieStore = await cookies()
  const hasDemoCookie = cookieStore.has("mockmate-demo-session")
  let activeUser = (session?.user || supabaseUser) as any

  let isDemoMode = false
  if (!activeUser && hasDemoCookie) {
    isDemoMode = true
    activeUser = {
      name: "Straw Hat Luffy",
      email: "luffy@goingmerry.org",
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors">
              ← Dashboard
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Resume Analyzer
            </h1>
          </div>
          <LogoutButton />
        </div>

        <ResumeContent initialResumeText={resumeText} initialAnalysis={analysis} />
      </div>
    </main>
  )
}
