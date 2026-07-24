import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  Mic,
  Laptop,
  UserRound,
  FileText,
  ArrowRight,
  Brain,
  CheckCircle2,
  Calendar,
  Flame,
  BarChart2,
  Settings,
  Sparkles,
  Play
} from "lucide-react"
import { MySchedule } from "@/components/MySchedule"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/getCurrentUser"

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

// Map avatar strings to Lucide icons
const avatarIconMap: Record<string, React.FC<any>> = {
  "laptop-code": Laptop,
  "user-tie": UserRound,
}

// Removed calculateStreak helper as streak is now stored in DB

export default async function DashboardPage() {
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

  let displayName = "User"
  let avatarKey = "user-tie"
  let hasResume = false
  let hasCustomUsername = false
  let hasCustomAvatar = false
  let latestFeedback = null
  let totalSessions = 0
  let avgScore: number | string = "—"
  let currentStreak = 0
  let recentBadges: any[] = []
  
  interface DisplaySession {
    id: string
    type: "mock" | "coding"
    date: Date
    category: string
    score: number | null
    status: string
    url: string
  }

  let recentSessionsList: DisplaySession[] = []

  if (activeUser && userId) {
    if (isDemoMode) {
      displayName = activeUser.name || "Guest"
      avatarKey = activeUser.avatar_url || "user-tie"
      hasResume = false
      hasCustomUsername = true
      hasCustomAvatar = true
      totalSessions = 0
      avgScore = "—"
      currentStreak = 0
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
      hasCustomUsername = !!profile.username && profile.username !== "User"
      hasCustomAvatar = !!profile.avatar_url && profile.avatar_url !== "user-tie"

      // 2. Fetch completed interviews (mock sessions)
      const { data: mockInterviews } = await supabase
        .from("interviews")
        .select(`
          id,
          category,
          status,
          created_at,
          feedback (
            score,
            summary,
            improvement_suggestions
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      const completedMockInterviews: any[] = mockInterviews?.filter((i: any) => i.status === "completed") || []
      totalSessions = completedMockInterviews.length

      // Calculate Average Score
      if (completedMockInterviews.length > 0) {
        const scores = completedMockInterviews
          .map((i: any) => i.feedback?.[0]?.score)
          .filter((s): s is number => typeof s === "number")
        if (scores.length > 0) {
          avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }
      }

      // Calculate Streak from DB
      currentStreak = profile.current_streak || 0

      // Fetch Coding Sessions
      const { data: codingSessions } = await supabase
        .from("interview_sessions")
        .select(`
          id,
          status,
          started_at,
          submitted_at,
          challenges (
            title,
            difficulty
          ),
          interview_reports (
            id,
            overall_score
          )
        `)
        .eq("user_id", userId)
        .order("started_at", { ascending: false })

      // Latest completed feedback from mock interviews
      if (completedMockInterviews.length > 0) {
        const latestMock = completedMockInterviews[0] as any
        if (latestMock.feedback && latestMock.feedback[0]) {
          const fb = latestMock.feedback[0]
          latestFeedback = {
            score: fb.score,
            summary: fb.summary,
            improvements: fb.improvement_suggestions || [],
            category: latestMock.category === "hr" ? "HR" : latestMock.category === "technical" ? "Technical" : "Mixed",
            date: new Date(latestMock.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            id: latestMock.id
          }
        }
      }

      // Map sessions to display list
      const mockSessionsMapped: DisplaySession[] = completedMockInterviews.map((i: any) => ({
        id: i.id,
        type: "mock",
        date: new Date(i.created_at),
        category: i.category === "hr" ? "HR Interview" : i.category === "technical" ? "Technical Interview" : "Mixed Interview",
        score: i.feedback?.[0]?.score ?? null,
        status: i.status,
        url: `/interview/${i.id}/feedback`
      }))

      const codingSessionsMapped: DisplaySession[] = (codingSessions || []).map((s: any) => ({
        id: s.id,
        type: "coding",
        date: new Date(s.submitted_at || s.started_at),
        category: `Coding: ${s.challenges?.title || "Challenge"}`,
        score: s.interview_reports?.[0]?.overall_score ?? null,
        status: s.status === "evaluated" ? "completed" : s.status,
        url: s.status === "evaluated" ? `/interview/report/${s.interview_reports?.[0]?.id}` : `/interview/session/${s.id}`
      }))

      recentSessionsList = [...mockSessionsMapped, ...codingSessionsMapped]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5)

      // Fetch Recent Badges
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select(`
          badge_slug,
          earned_at,
          badges (
            name,
            icon,
            rarity
          )
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(3)
        
      if (userBadges) {
        recentBadges = userBadges.map((ub: any) => ({
          slug: ub.badge_slug,
          earnedAt: ub.earned_at,
          name: ub.badges?.name || "Unknown Badge",
          icon: ub.badges?.icon || "fa-solid fa-certificate",
          rarity: ub.badges?.rarity || "common"
        }))
      }
    }
  } else {
    redirect("/login")
  }

  return (
    <main className="min-h-screen px-6 pt-4 pb-6 md:px-12 md:pt-4 md:pb-12 relative overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="font-serif">Dashboard</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Let's elevate your interview performance today.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-row items-center gap-4">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sessions Completed</p>
                <h3 className="text-2xl font-serif font-bold text-foreground">{totalSessions}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-row items-center gap-4">
              <div className="size-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <BarChart2 size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Score</p>
                <h3 className="text-2xl font-serif font-bold text-foreground">
                  {avgScore !== "—" ? `${avgScore}%` : "—"}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-row items-center gap-4">
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Flame size={20} className={currentStreak > 0 ? "animate-pulse" : ""} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Streak</p>
                <h3 className="text-2xl font-serif font-bold text-foreground">{currentStreak} day{currentStreak !== 1 ? "s" : ""}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6 flex flex-row items-center gap-4">
              <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Calendar size={20} />
              </div>
              <div className="space-y-0.5 w-full">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Scheduled Session</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-foreground">Not scheduled</span>
                  <Link href="/interview/setup" className="text-[10px] text-primary hover:underline font-bold shrink-0">
                    Book
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Badges Strip */}
        {recentBadges.length > 0 && (
          <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm overflow-x-auto">
            <div className="flex-shrink-0 mr-2 flex flex-col items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Sparkles size={14} className="text-amber-500" /> Recent</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Unlock more in Profile</span>
            </div>
            {recentBadges.map((badge, idx) => {
              const rarityColors = {
                common: "border-slate-200 bg-slate-50 text-slate-700",
                rare: "border-blue-200 bg-blue-50 text-blue-700",
                legendary: "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
              }
              const colorClass = rarityColors[badge.rarity as keyof typeof rarityColors] || rarityColors.common;
              
              return (
                <div key={badge.slug} className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${colorClass} min-w-max transition-all hover:scale-105 duration-300`}>
                  <div className="flex items-center justify-center size-8 rounded-full bg-white/60 shadow-sm">
                    <i className={`${badge.icon} text-lg`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{badge.name}</p>
                    <p className="text-[10px] opacity-80 font-medium uppercase tracking-wider">{badge.rarity}</p>
                  </div>
                </div>
              )
            })}
            
            <div className="ml-auto pl-4">
              <Link href="/dashboard/profile" className="text-xs font-bold text-primary hover:underline whitespace-nowrap flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* My Schedule Row */}
        <MySchedule />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Tabs defaultValue="admissions" className="w-full">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <TabsList className="bg-muted p-1 rounded-lg">
                  <TabsTrigger value="admissions" className="px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Admissions Practice
                  </TabsTrigger>
                  <TabsTrigger value="engineering" className="px-4 py-1.5 text-xs font-semibold cursor-pointer">
                    Engineering Practice
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="admissions" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mock Interview Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    <CardHeader className="pb-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Mic size={20} />
                      </div>
                      <CardTitle className="text-base font-bold" style={headingStyle}>Start a Mock Interview</CardTitle>
                      <CardDescription className="text-xs">
                        Practice real-time College Admission interviews with AI voice capability. Choose supportive or strict modes.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Link href="/interview/setup" className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer gap-1.5">
                        Start Interview Track <ArrowRight size={14} />
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Resume Analyzer Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                    <CardHeader className="pb-3">
                      <div className="size-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-2">
                        <FileText size={20} />
                      </div>
                      <CardTitle className="text-base font-bold" style={headingStyle}>Resume Analyzer</CardTitle>
                      <CardDescription className="text-xs">
                        Scan your resume using Mock AI, identify critical weaknesses, and automatically generate tailored mock questions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <span className={`size-1.5 rounded-full ${hasResume ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
                          {hasResume ? "Analysis Ready" : "No Resume Uploaded"}
                        </span>
                        <Link href="/dashboard/resume" className="inline-flex items-center justify-center px-3 py-2 border border-border hover:border-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer gap-1">
                          Configure <ArrowRight size={12} />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="engineering" className="space-y-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="size-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                        <Laptop size={20} />
                      </div>
                      <Badge variant="secondary" className="bg-secondary/15 text-secondary text-[10px] font-bold">AGENTIC</Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-2" style={headingStyle}>Coding Simulator</CardTitle>
                    <CardDescription className="text-xs max-w-xl">
                      Practice complex agentic coding interviews in a mock IDE. Orchestrate an AI coding agent to write, debug, and optimize algorithms while answering technical concept critiques.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href="/interview" className="inline-flex items-center justify-center px-4 py-2 border border-border hover:border-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer gap-1.5">
                      Enter Coding Practice Workspace <ArrowRight size={14} />
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Recent Sessions List / Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider" style={headingStyle}>Recent Sessions</h3>
              <Card className="shadow-sm overflow-hidden">
                {recentSessionsList.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-muted-foreground h-9">Date</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground h-9">Type</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground h-9">Score</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground h-9">Status</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground h-9 text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessionsList.map((session) => {
                        const dateFormatted = session.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                        const scoreColor = session.score !== null 
                          ? session.score >= 85 ? "bg-green-500/10 text-green-500 border border-green-500/25"
                            : session.score >= 70 ? "bg-purple-500/10 text-purple-500 border border-purple-500/25"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/25"
                          : ""
                        return (
                          <TableRow key={session.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="text-xs font-medium py-3 text-muted-foreground">{dateFormatted}</TableCell>
                            <TableCell className="text-xs font-bold text-foreground py-3 capitalize">{session.category}</TableCell>
                            <TableCell className="text-xs py-3">
                              {session.score !== null ? (
                                <Badge variant="outline" className={`${scoreColor} text-[10px] font-bold`}>{session.score}%</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-3">
                              <Badge variant="secondary" className="text-[10px] font-semibold py-0 h-5 capitalize">{session.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs py-3 text-right">
                              <Link href={session.url} className="text-primary hover:underline font-bold text-[10px] inline-flex items-center gap-0.5">
                                {session.status === "completed" ? "Report" : "Resume"} <ArrowRight size={10} />
                              </Link>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center bg-card text-muted-foreground text-xs leading-relaxed">
                    No sessions yet — start your first mock interview.
                    <div className="mt-4">
                      <Link href="/interview/setup" className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold">
                        Start Interview Track <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Right Column (1/3 width) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* AI Coach Insights */}
            <Card className="shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="pb-4">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Brain size={14} className="text-primary" />
                  AI Coach Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestFeedback ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="text-xs text-foreground italic border-l-2 border-primary pl-3 py-1 bg-muted/30 rounded-r-lg">
                      &ldquo;{latestFeedback.summary}&rdquo;
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-primary" /> Key Focus Suggestions
                      </h4>
                      <ul className="text-xs text-muted-foreground space-y-2 list-none pl-0">
                        {latestFeedback.improvements.slice(0, 3).map((tip: string, idx: number) => (
                          <li key={idx} className="flex gap-2 items-start leading-relaxed">
                            <span className="text-primary font-bold shrink-0">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href={`/interview/${latestFeedback.id}/feedback`} className="w-full h-8 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-[10px] text-primary font-bold cursor-pointer flex items-center justify-center">
                      View Full Analysis Report
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Complete your first mock interview to unlock personalized, AI-powered behavioral and technical delivery critiques.
                    </p>
                    <div className="bg-muted/40 border border-border p-3.5 rounded-lg space-y-2">
                      <h4 className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-500" /> Onboarding Checklist
                      </h4>
                      <div className="space-y-1.5 text-xs text-muted-foreground text-left">
                        <div className="flex items-center gap-2 py-0.5">
                          <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                          <span className="line-through">Create account</span>
                        </div>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className={`size-3.5 rounded-full border border-border flex items-center justify-center shrink-0 ${hasCustomUsername ? 'bg-green-500/10 border-green-500/30' : ''}`}>
                            {hasCustomUsername ? <CheckCircle2 size={12} className="text-green-500" /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                          </span>
                          <Link href="/dashboard/profile" className={hasCustomUsername ? "line-through" : "hover:underline text-foreground font-medium"}>Set customized username</Link>
                        </div>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className={`size-3.5 rounded-full border border-border flex items-center justify-center shrink-0 ${hasCustomAvatar ? 'bg-green-500/10 border-green-500/30' : ''}`}>
                            {hasCustomAvatar ? <CheckCircle2 size={12} className="text-green-500" /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                          </span>
                          <Link href="/dashboard/profile" className={hasCustomAvatar ? "line-through" : "hover:underline text-foreground font-medium"}>Choose customized avatar</Link>
                        </div>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className={`size-3.5 rounded-full border border-border flex items-center justify-center shrink-0 ${hasResume ? 'bg-green-500/10 border-green-500/30' : ''}`}>
                            {hasResume ? <CheckCircle2 size={12} className="text-green-500" /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                          </span>
                          <Link href="/dashboard/resume" className={hasResume ? "line-through" : "hover:underline text-foreground font-medium"}>Configure Resume Analyzer</Link>
                        </div>
                        <div className="flex items-center gap-2 py-0.5">
                          <span className={`size-3.5 rounded-full border border-border flex items-center justify-center shrink-0 ${totalSessions > 0 ? 'bg-green-500/10 border-green-500/30' : ''}`}>
                            {totalSessions > 0 ? <CheckCircle2 size={12} className="text-green-500" /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                          </span>
                          <Link href="/interview/setup" className={totalSessions > 0 ? "line-through" : "hover:underline text-foreground font-medium"}>Start first interview</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col text-xs font-semibold">
                  <Link href="/dashboard/profile" className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors text-foreground">
                    <span className="flex items-center gap-2.5">
                      <UserRound size={16} className="text-muted-foreground" /> Update Profile
                    </span>
                    <ArrowRight size={14} className="text-muted-foreground/40" />
                  </Link>
                  <Separator />
                  <Link href="/dashboard/profile" className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors text-foreground">
                    <span className="flex items-center gap-2.5">
                      <Settings size={16} className="text-muted-foreground" /> View Progress & Settings
                    </span>
                    <ArrowRight size={14} className="text-muted-foreground/40" />
                  </Link>
                  <Separator />
                  <Link href="/pricing" className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors text-foreground">
                    <span className="flex items-center gap-2.5">
                      <FileText size={16} className="text-muted-foreground" /> Manage Billing
                    </span>
                    <ArrowRight size={14} className="text-muted-foreground/40" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
