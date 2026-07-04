import { GlassCard } from "@/components/ui/glass-card"
import Link from "next/link"
import {
  Mic,
  Laptop,
  UserRound,
  Rocket,
  Brain,
  Star,
  FileText,
  ArrowRight,
  Lightbulb,
  CheckCircle,
  PlayCircle,
  AlertTriangle
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Map avatar strings to Lucide icons
const avatarIconMap: Record<string, React.FC<any>> = {
  "laptop-code": Laptop,
  "user-tie": UserRound,
  "rocket": Rocket,
  "brain": Brain,
  "star": Star,
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default async function DashboardPage() {
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
      console.error("Dashboard: Failed to fetch Supabase user:", err)
    }
  }

  let displayName = "User"
  let avatarKey = "user-tie"
  let hasResume = false
  let latestFeedback = null
  let totalSessions = 0

  if (activeUser && userId) {
    if (isDemoMode) {
      displayName = activeUser.name || "Guest"
      avatarKey = activeUser.avatar_url || "user-tie"
      hasResume = false
      totalSessions = 0
      latestFeedback = null
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

      displayName = profile.username || activeUser.name || activeUser.email?.split("@")[0] || "User"
      avatarKey = profile.avatar_url || "user-tie"
      hasResume = !!profile.resume_text

      // 2. Fetch interviews count
      const { count } = await supabase
        .from("interviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      totalSessions = count || 0

      // 3. Fetch latest completed interview feedback
      const { data: latestInterview } = await supabase
        .from("interviews")
        .select(`
          id,
          category,
          created_at,
          feedback (
            score,
            summary,
            improvement_suggestions
          )
        `)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestInterview && latestInterview.feedback && latestInterview.feedback[0]) {
        const fb = latestInterview.feedback[0]
        latestFeedback = {
          score: fb.score,
          summary: fb.summary,
          improvements: fb.improvement_suggestions || [],
          category: latestInterview.category === "hr" ? "HR" : latestInterview.category === "technical" ? "Technical" : "Mixed",
          date: new Date(latestInterview.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          id: latestInterview.id
        }
      }
    }
  } else {
    redirect("/login")
  }

  // Fallback / default tip of the day
  const dailyTip = {
    title: "Structure with STAR",
    description: "When answering behavioral questions, structure your response as: Situation, Task, Action, and Result. This gives clear context to your achievements."
  }

  const AvatarIcon = avatarIconMap[avatarKey] || UserRound

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="size-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary overflow-hidden">
            <AvatarIcon size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" style={headingStyle}>
              Welcome back, <span className="text-primary">{displayName}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Let&apos;s elevate your interview performance today.</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Prep Options and Main Controls (8/12 width) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Banner info */}
            <GlassCard className="py-14 px-8 md:px-10 relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-primary/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl pointer-events-none" />
              <h2 className="text-xl font-bold mb-2 text-foreground" style={headingStyle}>Practice makes perfect</h2>
              <p className="text-sm text-body leading-relaxed max-w-lg">
                Ready to practice? Choose a mock interview type or set up the Resume Analyzer to tailor questions directly to your career history and skills.
              </p>
            </GlassCard>

            {/* Separator line */}
            <div className="h-[1px] bg-border w-full my-4" />

            {/* Admissions Practice Section */}
            <div className="px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase mt-4 mb-4">
              ADMISSIONS PRACTICE
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-4">
              
              {/* Mock Interview Tool — PRIMARY ACTION */}
              <GlassCard 
                className="p-6 border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary transition-all duration-150 group md:col-span-2"
                style={{ minHeight: "240px" }}
              >
                {/* Icon Block */}
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <Mic size={24} strokeWidth={1.75} />
                </div>
                {/* Tag Row */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">HR</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Technical</span>
                </div>
                {/* Title */}
                <h3 className="text-lg font-bold mt-4 text-foreground" style={headingStyle}>Start a Mock Interview</h3>
                {/* Description */}
                <p className="text-sm text-body mt-2 leading-relaxed">
                  Practice structured, real-time interviews. Select from HR, Technical, or Mixed questions. Get instant AI-powered feedback on your answers.
                </p>
                {/* CTA Button */}
                <div className="mt-6 w-full">
                  <Link href="/interview/setup" className="btn btn-primary w-full justify-center">
                    Start Interview <ArrowRight size={16} strokeWidth={2} />
                  </Link>
                </div>
              </GlassCard>

              {/* Resume Analyzer Tool — SECONDARY */}
              <GlassCard 
                className="p-6 border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary transition-all duration-150 group"
                style={{ minHeight: "240px" }}
              >
                {/* Icon Block */}
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary mb-4">
                  <FileText size={24} strokeWidth={1.75} />
                </div>
                {/* Tag Row */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Analyzer</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Resume</span>
                </div>
                {/* Title */}
                <h3 className="text-lg font-bold mt-4 text-foreground" style={headingStyle}>Resume Analyzer</h3>
                {/* Description */}
                <p className="text-sm text-body mt-2 leading-relaxed line-clamp-3">
                  Scan your resume with Mock AI. Uncover improvement areas and unlock custom tailored mock interviews.
                </p>
                {/* Status indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  {hasResume ? (
                    <>
                      <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-muted-foreground">Analysis Ready</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertTriangle size={14} strokeWidth={1.75} className="text-amber-500" />
                      <span>No Resume Synced</span>
                    </div>
                  )}
                </div>
                {/* CTA Button */}
                <div className="mt-6 w-full">
                  <Link href="/dashboard/resume" className="btn btn-ghost w-full justify-center">
                    Configure <ArrowRight size={14} strokeWidth={2} />
                  </Link>
                </div>
              </GlassCard>

            </div>

            {/* Engineering Practice Section */}
            <div className="h-[1px] bg-border w-full my-2" />
            <div className="px-6 flex items-center gap-2 mt-4 mb-4">
              <span className="text-xs font-bold text-accent-foreground tracking-widest uppercase">ENGINEERING PRACTICE</span>
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">CODE</span>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-4">
              {/* Coding Simulator Tool */}
              <GlassCard 
                className="p-6 border border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary transition-all duration-150 group"
                style={{ minHeight: "200px" }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Icon Block */}
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground shrink-0">
                    <Laptop size={24} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1">
                    {/* Tag Row */}
                    <div className="flex flex-wrap gap-2 text-xs mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground font-medium">Agentic</span>
                      <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground font-medium">Bug Fix</span>
                    </div>
                    {/* Title */}
                    <h3 className="text-lg font-bold text-foreground" style={headingStyle}>Coding Simulator</h3>
                    {/* Description */}
                    <p className="text-sm text-body mt-2 leading-relaxed">
                      Practice agentic coding interviews. Direct an AI agent to solve engineering problems in real time.
                    </p>
                  </div>
                  {/* CTA Button */}
                  <div className="shrink-0">
                    <Link href="/interview" className="btn btn-ghost" style={{ borderColor: "var(--emerald-200)", color: "var(--emerald-600)" }}>
                      Code Practice <ArrowRight size={14} strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Right Column: AI Coach insights panel (4/12 width) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <GlassCard className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Brain size={14} strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "var(--font-body), sans-serif" }}>AI Coach Insights</h3>
              </div>

              {latestFeedback ? (
                <div className="flex flex-col gap-4">
                  {/* Latest Score Card */}
                  <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 border border-border">
                    <div className="size-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 text-lg font-bold">
                      {latestFeedback.score}
                    </div>
                    <div>
                      <h4 className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Last Session</h4>
                      <p className="text-sm font-semibold text-body">{latestFeedback.category} Interview ({latestFeedback.date})</p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="text-xs text-body leading-relaxed italic border-l-2 border-primary/30 pl-3 py-1">
                    &ldquo;{latestFeedback.summary}&rdquo;
                  </div>

                  {/* Recommendations */}
                  <div className="mt-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle size={12} strokeWidth={1.75} className="text-primary" /> Focus Suggestions
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-2 pl-1 list-none">
                      {latestFeedback.improvements.slice(0, 3).map((tip: string, idx: number) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="text-primary">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link href={`/interview/${latestFeedback.id}/feedback`} className="w-full h-9 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-xs text-primary font-bold mt-2 cursor-pointer flex items-center justify-center">
                    View Full Analysis Report
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-5 py-4">
                  {/* Onboarding Checklist */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mt-12 mb-4">ONBOARDING CHECKLIST</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-body py-2.5 leading-relaxed">
                        <CheckCircle size={20} strokeWidth={1.75} className="shrink-0 text-green-500" />
                        <span className="line-through text-muted-foreground">Set up profile credentials</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-body py-2.5 leading-relaxed">
                        {hasResume ? (
                          <CheckCircle size={20} strokeWidth={1.75} className="shrink-0 text-green-500" />
                        ) : (
                          <PlayCircle size={20} strokeWidth={1.75} className="shrink-0 text-secondary" />
                        )}
                        <span className={hasResume ? "line-through text-muted-foreground" : "font-medium"}>
                          <Link href="/dashboard/resume" className="hover:underline">Configure Resume Analyzer</Link>
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-body py-2.5 leading-relaxed">
                        {totalSessions > 0 ? (
                          <CheckCircle size={20} strokeWidth={1.75} className="shrink-0 text-green-500" />
                        ) : (
                          <PlayCircle size={20} strokeWidth={1.75} className="shrink-0 text-primary" />
                        )}
                        <span className={totalSessions > 0 ? "line-through text-muted-foreground" : "font-medium"}>
                          <Link href="/interview/setup" className="hover:underline">Start your first interview</Link>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Tip */}
                  <div className="bg-muted border border-accent rounded-xl p-4 mt-6 shadow-sm">
                    <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                      <Lightbulb size={14} strokeWidth={1.75} /> Coach Tip of the Day
                    </h4>
                    <h5 className="text-xs font-bold text-body mb-1">{dailyTip.title}</h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{dailyTip.description}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </main>
  )
}
