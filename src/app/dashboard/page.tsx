import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faMicrophone,
  faLaptopCode,
  faUserTie,
  faRocket,
  faBrain,
  faStar,
  faFileLines,
  faUserGear,
  faArrowRight,
  faLightbulb,
  faCheckCircle,
  faCircleCheck,
  faCirclePlay,
  faTriangleExclamation
} from "@fortawesome/free-solid-svg-icons"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Map avatar strings to FontAwesome icons
const avatarMap: Record<string, typeof faUserTie> = {
  "laptop-code": faLaptopCode,
  "user-tie": faUserTie,
  "rocket": faRocket,
  "brain": faBrain,
  "star": faStar,
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const hasDemoCookie = cookieStore.has("mockmate-demo-session")

  let supabaseUser = null
  let activeUser = session?.user as any
  let userId = (session?.user as any)?.id

  let isDemoMode = false
  if (!activeUser && hasDemoCookie) {
    isDemoMode = true
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
  let avatarIcon = faUserTie
  let hasResume = false
  let latestFeedback = null
  let totalSessions = 0

  if (activeUser && userId) {
    if (isDemoMode) {
      displayName = activeUser.name || "Guest"
      avatarIcon = avatarMap[activeUser.avatar_url || ""] || faUserTie
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
      avatarIcon = avatarMap[profile.avatar_url || ""] || faUserTie
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

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group text-xl font-bold text-foreground hover:text-primary transition-colors">
              <svg className="size-6 text-primary transition-transform group-hover:scale-110" viewBox="0 0 80 80" aria-hidden="true" fill="currentColor">
                <rect width="80" height="80" rx="18" fill="#059669" />
                <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
                <rect x="30" y="40" width="20" height="8" fill="#059669" />
              </svg>
              Almaprep
            </Link>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-lg overflow-hidden">
                {session?.user?.image ? (
                  <img src={session.user.image} alt={displayName} className="size-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={avatarIcon} />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, <span className="text-primary">{displayName}</span>
                </h1>
                <p className="text-foreground/60 text-sm mt-0.5">Let&apos;s elevate your interview performance today.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/pricing" className="flex-1 sm:flex-initial group relative inline-block transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03]">
              {/* Animated glowing backdrop */}
              <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-accent to-primary rounded-xl blur opacity-20 group-hover:opacity-80 transition duration-500"></div>
              
              {/* Border shimmer wrapper */}
              <div className="relative p-[1px] rounded-xl overflow-hidden bg-white/10 group-hover:bg-gradient-to-r group-hover:from-secondary group-hover:via-white/60 group-hover:to-primary transition-all duration-500 shadow-xl">
                {/* Button surface */}
                <button className="relative w-full sm:w-auto h-12 px-6 rounded-[11px] text-sm font-semibold bg-white border border-border text-foreground flex items-center justify-center gap-2 cursor-pointer overflow-hidden">
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-secondary/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></span>
                  
                  <FontAwesomeIcon icon={faStar} className="text-secondary group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 relative z-10" /> 
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors duration-300 relative z-10">Pricing / Plans</span>
                </button>
              </div>
            </Link>

            <Link href="/dashboard/profile" className="flex-1 sm:flex-initial group relative inline-block transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.03]">
              {/* Animated glowing backdrop */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-xl blur opacity-20 group-hover:opacity-80 transition duration-500"></div>
              
              {/* Border shimmer wrapper */}
              <div className="relative p-[1px] rounded-xl overflow-hidden bg-white/10 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-white/60 group-hover:to-secondary transition-all duration-500 shadow-xl">
                {/* Button surface */}
                <button className="relative w-full sm:w-auto h-12 px-6 rounded-[11px] text-sm font-semibold bg-white border border-border text-foreground flex items-center justify-center gap-2 cursor-pointer overflow-hidden">
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></span>
                  
                  <FontAwesomeIcon icon={faUserGear} className="text-primary group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 relative z-10" /> 
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors duration-300 relative z-10">My Profile</span>
                </button>
              </div>
            </Link>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Prep Options and Main Controls (8/12 width) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Banner info */}
            <GlassCard className="py-14 px-8 md:px-10 relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-primary/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl pointer-events-none" />
              <h2 className="text-xl font-bold mb-2 text-[#0f172a]">Practice makes perfect</h2>
              <p className="text-sm text-foreground/75 leading-relaxed max-w-lg">
                Ready to practice? Choose a mock interview type or set up the Resume Analyzer to tailor questions directly to your career history and skills.
              </p>
            </GlassCard>

            {/* Separator line */}
            <div className="h-[1px] bg-slate-200/60 w-full my-4" />

            {/* Subtle Section Label */}
            <div className="px-6 text-xs font-bold text-gray-400 tracking-widest uppercase mt-4 mb-4">
              INTERVIEW TYPES
            </div>

            {/* Prep Tools Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-4">
              
              {/* Mock Interview Tool */}
              <GlassCard 
                className="p-6 border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#10B981] transition-all duration-150 ease-in-out group"
                style={{ minHeight: "240px" }}
              >
                {/* Icon Block */}
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xl mb-4 group-hover:scale-105 transition-transform" style={{ width: "48px", height: "48px" }}>
                  <FontAwesomeIcon icon={faMicrophone} />
                </div>
                {/* Tag Row */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">HR</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Technical</span>
                </div>
                {/* Title */}
                <h3 className="text-lg font-bold mt-4 text-[#0f172a] whitespace-nowrap">Mock Interview Session</h3>
                {/* Description */}
                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">
                  Practice structured, real-time interviews. Select from HR, Technical, or Mixed questions.
                </p>
                {/* CTA Button */}
                <div className="mt-6 w-full">
                  <Link href="/interview/setup" className="w-full">
                    <GlowButton className="w-full h-10 text-xs font-semibold cursor-pointer">
                      Start Prep <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
                    </GlowButton>
                  </Link>
                </div>
              </GlassCard>

              {/* Coding Simulator Tool */}
              <GlassCard 
                className="p-6 border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#10B981] transition-all duration-150 ease-in-out group"
                style={{ minHeight: "240px" }}
              >
                {/* Icon Block */}
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground text-xl mb-4 group-hover:scale-105 transition-transform" style={{ width: "48px", height: "48px" }}>
                  <FontAwesomeIcon icon={faLaptopCode} />
                </div>
                {/* Tag Row */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Agentic</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Bug Fix</span>
                </div>
                {/* Title */}
                <h3 className="text-lg font-bold mt-4 text-[#0f172a] whitespace-nowrap">Coding Simulator</h3>
                {/* Description */}
                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">
                  Practice agentic coding interviews. Direct an AI agent to solve engineering problems in real time.
                </p>
                {/* CTA Button */}
                <div className="mt-6 w-full">
                  <Link href="/interview" className="w-full">
                    <GlowButton className="w-full h-10 text-xs font-semibold cursor-pointer bg-gradient-to-r from-accent-foreground to-primary">
                      Code Practice <FontAwesomeIcon icon={faArrowRight} className="ml-1.5" />
                    </GlowButton>
                  </Link>
                </div>
              </GlassCard>

              {/* Resume Analyzer Tool */}
              <GlassCard 
                className="p-6 border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#10B981] transition-all duration-150 ease-in-out group"
                style={{ minHeight: "240px" }}
              >
                {/* Icon Block */}
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary text-xl mb-4 group-hover:scale-105 transition-transform" style={{ width: "48px", height: "48px" }}>
                  <FontAwesomeIcon icon={faFileLines} />
                </div>
                {/* Tag Row */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Analyzer</span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">Resume</span>
                </div>
                {/* Title */}
                <h3 className="text-lg font-bold mt-4 text-[#0f172a] whitespace-nowrap">Resume Analyzer</h3>
                {/* Description */}
                <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">
                  Scan your resume with Mock AI. Uncover improvement areas and unlock custom tailored mock interviews.
                </p>
                {/* Empty State / Status indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  {hasResume ? (
                    <>
                      <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[#9CA3AF]">Analysis Ready</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-xs" />
                      <span className="text-[#9CA3AF]">No Resume Synced</span>
                    </div>
                  )}
                </div>
                {/* CTA Button */}
                <div className="mt-6 w-full">
                  <Link href="/dashboard/resume" className="w-full">
                    <button className="w-full h-10 rounded-lg text-xs font-bold border border-[#E5E7EB] bg-white text-gray-700 hover:bg-[#059669] hover:text-white transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer">
                      Configure <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                    </button>
                  </Link>
                </div>
              </GlassCard>

            </div>
          </div>

          {/* Right Column: AI Coach insights panel (4/12 width) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <GlassCard className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs">
                  <FontAwesomeIcon icon={faBrain} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">AI Coach Insights</h3>
              </div>

              {latestFeedback ? (
                <div className="flex flex-col gap-4">
                  {/* Latest Score Card */}
                  <div className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="size-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-lg font-bold">
                      {latestFeedback.score}
                    </div>
                    <div>
                      <h4 className="text-xs text-foreground/50 font-bold uppercase tracking-wide">Last Session</h4>
                      <p className="text-sm font-semibold text-foreground/80">{latestFeedback.category} Interview ({latestFeedback.date})</p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="text-xs text-foreground/75 leading-relaxed italic border-l-2 border-primary/30 pl-3 py-1">
                    &ldquo;{latestFeedback.summary}&rdquo;
                  </div>

                  {/* Recommendations */}
                  <div className="mt-2">
                    <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-primary text-[10px]" /> Focus Suggestions
                    </h4>
                    <ul className="text-xs text-foreground/60 space-y-2 pl-1 list-none">
                      {latestFeedback.improvements.slice(0, 3).map((tip: string, idx: number) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="text-primary">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link href={`/interview/${latestFeedback.id}/feedback`}>
                    <button className="w-full h-9 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-xs text-primary font-bold mt-2 cursor-pointer">
                      View Full Analysis Report
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-5 py-4">
                  {/* Onboarding Checklist */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-[0.15em] mt-12 mb-4">ONBOARDING CHECKLIST</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80 py-2.5 leading-relaxed">
                        <FontAwesomeIcon icon={faCircleCheck} className="shrink-0 text-green-400" style={{ width: "20px", height: "20px" }} />
                        <span className="line-through text-foreground/40">Set up profile credentials</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80 py-2.5 leading-relaxed">
                        <FontAwesomeIcon icon={hasResume ? faCircleCheck : faCirclePlay} className={`shrink-0 ${hasResume ? "text-green-400" : "text-secondary"}`} style={{ width: "20px", height: "20px" }} />
                        <span className={hasResume ? "line-through text-foreground/40" : "font-medium"}>
                          <Link href="/dashboard/resume" className="hover:underline">Configure Resume Analyzer</Link>
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-foreground/80 py-2.5 leading-relaxed">
                        <FontAwesomeIcon icon={totalSessions > 0 ? faCircleCheck : faCirclePlay} className={`shrink-0 ${totalSessions > 0 ? "text-green-400" : "text-primary"}`} style={{ width: "20px", height: "20px" }} />
                        <span className={totalSessions > 0 ? "line-through text-foreground/40" : "font-medium"}>
                          <Link href="/interview/setup" className="hover:underline">Start your first interview</Link>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Tip Wrapped in custom card module */}
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 mt-6 shadow-sm">
                    <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLightbulb} /> Coach Tip of the Day
                    </h4>
                    <h5 className="text-xs font-bold text-foreground/80 mb-1">{dailyTip.title}</h5>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">{dailyTip.description}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pb-8 text-center text-sm text-foreground/40 font-medium">
          <p>Let&apos;s help you find your dream job <span className="text-red-500">❤️</span></p>
          <p className="mt-1 flex justify-center items-center gap-1">Built by Almaprep</p>
        </div>
      </div>
    </main>
  )
}

