import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_BADGES } from "@/lib/badgesData"
import AchievementsGallery from "@/components/badges/AchievementsGallery"

interface PhysicalMetric {
  bodyLanguageScore?: number
  posture_score?: number
}

interface BehavioralAnalysisData {
  session_id: string
  physical_metrics?: PhysicalMetric[] | null
  speaking_analysis?: {
    sessionSummary?: {
      metrics?: {
        totalFillerCount?: number
      }
    }
  } | null
}

interface InterviewFeedback {
  score: number
}

interface ProctoringLog {
  totalCount?: number
}

interface InterviewData {
  id: string
  category: string
  created_at: string
  feedback?: InterviewFeedback[] | null
  proctoring_log?: ProctoringLog | null
  is_flagged: boolean
}

interface BadgeStats {
  mockCount: number
  codingCount: number
  streak: number
  daysSinceSignup: number
  hasUsername: boolean
  hasAvatar: boolean
  hasResume: boolean
  hasGithub: boolean
  totalPerfectScores: number
  zeroFillerWordInterviews: number
  highBodyLanguageInterviews: number
  lowFillerWordInterviews: number
  zeroViolationInterviews: number
  firstTrySolves: number
  perfectQualitySolves: number
  fastSolves: number
  jsAndPythonSolves: Set<string>
  domainsCount: number
  maxConsecutiveHighScores: number
  reposPushed: number
  hasSaturday: boolean
  hasSunday: boolean
  maxActsInDay: number
  maxInterviewsInDay: number
}

interface UserBadgeStats {
  username?: string | null
  avatar_url?: string | null
  resume_text?: string | null
  current_streak?: number
  created_at?: string
}

function calculateDaysSinceSignup(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24))
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

// Believable earned set for demo mode (no DB).
const DEMO_EARNED = new Set([
  "first-step",
  "profile-pro",
  "resume-ready",
  "github-connected",
  "on-a-roll",
  "week-warrior",
  "nervous-no-more",
  "perfect-score",
  "bug-slayer",
  "problem-solver",
  "silver-tongue",
  "steady-climber",
  "lunch-break-hustler",
  "early-riser",
])

function getRewardXP(rarity: string): number {
  if (rarity === "legendary") return 250
  if (rarity === "rare") return 100
  return 50
}

function getBadgeProgress(slug: string, stats: BadgeStats): { current: number; target: number } {
  switch (slug) {
    // Getting Started
    case "first-step":
      return { current: stats.mockCount, target: 1 }
    case "code-debut":
      return { current: stats.codingCount, target: 1 }
    case "profile-pro": {
      let count = 0
      if (stats.hasUsername) count++
      if (stats.hasAvatar) count++
      if (stats.hasResume) count++
      if (stats.hasGithub) count++
      return { current: count, target: 4 }
    }
    case "resume-ready":
      return { current: stats.hasResume ? 1 : 0, target: 1 }
    case "github-connected":
      return { current: stats.hasGithub ? 1 : 0, target: 1 }
    case "early-bird":
      return { current: Math.min(stats.streak, 3), target: 3 }

    // Streak
    case "on-a-roll":
      return { current: stats.streak, target: 3 }
    case "week-warrior":
      return { current: stats.streak, target: 7 }
    case "fortnight-fighter":
      return { current: stats.streak, target: 14 }
    case "monthly-grinder":
      return { current: stats.streak, target: 30 }
    case "unstoppable":
      return { current: stats.streak, target: 60 }
    case "century-club":
      return { current: stats.streak, target: 100 }
    case "legend":
      return { current: stats.streak, target: 365 }

    // Interview
    case "nervous-no-more":
      return { current: stats.mockCount, target: 5 }
    case "interview-veteran":
      return { current: stats.mockCount, target: 25 }
    case "interview-machine":
      return { current: stats.mockCount, target: 50 }
    case "century-interviewer":
      return { current: stats.mockCount, target: 100 }
    case "domain-hopper":
      return { current: stats.domainsCount, target: 5 }
    case "domain-master":
      return { current: stats.domainsCount, target: 15 }
    case "domain-legend":
      return { current: stats.domainsCount, target: 20 }
    case "perfect-score":
      return { current: stats.totalPerfectScores, target: 1 }
    case "speed-talker":
      return { current: stats.zeroFillerWordInterviews, target: 1 }
    case "consistent-performer":
      return { current: stats.maxConsecutiveHighScores, target: 10 }

    // Coding
    case "bug-slayer":
      return { current: stats.firstTrySolves, target: 1 }
    case "optimizer":
      return { current: stats.perfectQualitySolves, target: 1 }
    case "polyglot": {
      let count = 0
      if (stats.jsAndPythonSolves.has("javascript")) count++
      if (stats.jsAndPythonSolves.has("python") || stats.jsAndPythonSolves.has("python3")) count++
      return { current: count, target: 2 }
    }
    case "github-publisher":
      return { current: stats.reposPushed >= 1 ? 1 : 0, target: 1 }
    case "problem-solver":
      return { current: stats.codingCount, target: 10 }
    case "code-veteran":
      return { current: stats.codingCount, target: 25 }
    case "code-machine":
      return { current: stats.codingCount, target: 50 }
    case "first-try":
      return { current: stats.firstTrySolves, target: 5 }
    case "speed-coder":
      return { current: stats.fastSolves, target: 1 }
    case "repo-builder":
      return { current: stats.reposPushed, target: 5 }

    // Skill
    case "body-language-boss":
      return { current: stats.highBodyLanguageInterviews, target: 3 }
    case "silver-tongue":
      return { current: stats.lowFillerWordInterviews, target: 3 }
    case "star-student":
      return { current: stats.mockCount >= 5 ? 5 : stats.mockCount, target: 5 }
    case "github-guru":
      return { current: stats.hasGithub ? 1 : 0, target: 1 }
    case "proctoring-pro":
      return { current: stats.zeroViolationInterviews, target: 1 }
    case "filler-free":
      return { current: stats.lowFillerWordInterviews, target: 3 }
    case "posture-perfect":
      return { current: stats.highBodyLanguageInterviews >= 1 ? 1 : 0, target: 1 }
    case "eye-contact-king":
      return { current: stats.highBodyLanguageInterviews, target: 3 }

    // Progress
    case "glow-up":
      return { current: stats.mockCount >= 5 ? 5 : stats.mockCount, target: 5 }
    case "comeback-kid":
      return { current: stats.mockCount >= 2 ? 1 : 0, target: 1 }
    case "steady-climber":
      return { current: stats.maxConsecutiveHighScores >= 5 ? 5 : stats.maxConsecutiveHighScores, target: 5 }
    case "weak-spot-warrior":
      return { current: stats.mockCount >= 3 ? 3 : stats.mockCount, target: 3 }
    case "all-rounder":
      return { current: stats.domainsCount >= 3 ? 3 : stats.domainsCount, target: 3 }
    case "overachiever":
      return { current: stats.maxActsInDay, target: 3 }
    case "weekend-warrior": {
      let count = 0
      if (stats.hasSaturday) count++
      if (stats.hasSunday) count++
      return { current: count, target: 2 }
    }

    // Special
    case "night-owl":
      return { current: stats.mockCount >= 1 ? 1 : 0, target: 1 }
    case "early-riser":
      return { current: stats.mockCount >= 1 ? 1 : 0, target: 1 }
    case "lunch-break-hustler":
      return { current: stats.mockCount >= 1 ? 1 : 0, target: 1 }
    case "marathon-session":
      return { current: stats.maxInterviewsInDay, target: 5 }
    case "ghost-mode":
      return { current: stats.zeroViolationInterviews >= 1 && stats.zeroFillerWordInterviews >= 1 ? 1 : 0, target: 1 }
    case "triple-threat":
      return { current: stats.maxActsInDay >= 3 ? 3 : stats.maxActsInDay, target: 3 }
    case "almaprep-og":
      return { current: 1, target: 1 }

    default:
      return { current: 0, target: 1 }
  }
}

export default async function BadgesPage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const isDemoMode = cookieStore.has("mockmate-demo-session")

  let earned = new Set<string>()
  const earnedDates: Record<string, string> = {}

  let stats = {
    mockCount: 0,
    codingCount: 0,
    streak: 0,
    daysSinceSignup: 0,
    hasUsername: false,
    hasAvatar: false,
    hasResume: false,
    hasGithub: false,
    totalPerfectScores: 0,
    zeroFillerWordInterviews: 0,
    highBodyLanguageInterviews: 0,
    lowFillerWordInterviews: 0,
    zeroViolationInterviews: 0,
    firstTrySolves: 0,
    perfectQualitySolves: 0,
    fastSolves: 0,
    jsAndPythonSolves: new Set<string>(),
    domainsCount: 0,
    maxConsecutiveHighScores: 0,
    reposPushed: 0,
    hasSaturday: false,
    hasSunday: false,
    maxActsInDay: 0,
    maxInterviewsInDay: 0,
  }

  if (isDemoMode) {
    earned = DEMO_EARNED
    const baseDate = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    Array.from(DEMO_EARNED).forEach((slug, idx) => {
      earnedDates[slug] = new Date(baseDate.getTime() + idx * 24 * 3600 * 1000).toISOString()
    })
    stats = {
      mockCount: 28,
      codingCount: 18,
      streak: 14,
      daysSinceSignup: 30,
      hasUsername: true,
      hasAvatar: true,
      hasResume: true,
      hasGithub: true,
      totalPerfectScores: 1,
      zeroFillerWordInterviews: 1,
      highBodyLanguageInterviews: 2,
      lowFillerWordInterviews: 1,
      zeroViolationInterviews: 2,
      firstTrySolves: 3,
      perfectQualitySolves: 1,
      fastSolves: 1,
      jsAndPythonSolves: new Set(["javascript"]),
      domainsCount: 7,
      maxConsecutiveHighScores: 4,
      reposPushed: 2,
      hasSaturday: true,
      hasSunday: false,
      maxActsInDay: 2,
      maxInterviewsInDay: 3,
    }
  } else {
    const supabase = await createClient()
    let userId = session?.user?.id
    try {
      const { data } = await supabase.auth.getUser()
      if (data?.user) userId = data.user.id
    } catch {}

    if (userId) {
      const { data: rows } = (await supabase
        .from("user_badges")
        .select("badge_slug, earned_at")
        .eq("user_id", userId)) as unknown as {
        data: { badge_slug: string; earned_at: string }[] | null
      }
      if (rows) {
        earned = new Set(rows.map((r) => r.badge_slug))
        rows.forEach((r) => {
          earnedDates[r.badge_slug] = r.earned_at
        })
      }

      try {
        let userRes
        try {
          userRes = await supabase
            .from("users")
            .select("username, avatar_url, resume_text, current_streak, created_at")
            .eq("id", userId)
            .maybeSingle()
        } catch {
          userRes = await supabase
            .from("users")
            .select("username, avatar_url, resume_text, created_at")
            .eq("id", userId)
            .maybeSingle()
        }

        const [interviewsRes, sessionsRes, solutionsRes, githubRes, behavioralRes] =
          await Promise.all([
            supabase
              .from("interviews")
              .select("id, category, created_at, feedback(score), proctoring_log, is_flagged")
              .eq("user_id", userId)
              .eq("status", "completed"),
            supabase
              .from("interview_sessions")
              .select("id, started_at, submitted_at, challenge_id")
              .eq("user_id", userId)
              .in("status", ["completed", "evaluated"]),
            supabase
              .from("coding_solutions")
              .select(
                "challenge_id, attempts, created_at, language, quality_score, test_results, github_repo_url"
              )
              .eq("user_id", userId),
            supabase.from("github_analysis").select("user_id").eq("user_id", userId).maybeSingle(),
            supabase
              .from("behavioral_analysis")
              .select("session_id, physical_metrics, speaking_analysis")
              .eq("user_id", userId),
          ])

        const dbUser = userRes?.data as any
        const interviews = interviewsRes?.data || []
        const codingSessions = sessionsRes?.data || []
        const codingSolutions = solutionsRes?.data || []
        const githubAnalysis = githubRes?.data || null
        const behavioralAnalysis = behavioralRes?.data || []

        const mockCount = interviews.length
        const codingCount = codingSessions.length
        const streak = dbUser?.current_streak || 0
        const createdAt = dbUser?.created_at ? new Date(dbUser.created_at) : new Date()
        const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24))
        const hasResume = !!dbUser?.resume_text
        const hasGithub = !!githubAnalysis
        const hasUsername = !!dbUser?.username
        const hasAvatar = !!dbUser?.avatar_url

        let totalPerfectScores = 0
        let zeroFillerWordInterviews = 0
        let highBodyLanguageInterviews = 0
        let lowFillerWordInterviews = 0
        let zeroViolationInterviews = 0

        const domains = new Set<string>()
        let consecutiveHighScores = 0
        let maxConsecutiveHighScores = 0

        const ascInterviews = [...interviews].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        ascInterviews.forEach((interview) => {
          const typedInterview = interview as unknown as InterviewData
          const fb = typedInterview.feedback?.[0]
          if (!fb) {
            consecutiveHighScores = 0
            return
          }

          if (interview.category) domains.add(interview.category)

          if (fb.score >= 100) totalPerfectScores++
          if (fb.score >= 80) {
            consecutiveHighScores++
            if (consecutiveHighScores > maxConsecutiveHighScores) {
              maxConsecutiveHighScores = consecutiveHighScores
            }
          } else {
            consecutiveHighScores = 0
          }

          const behavior = (behavioralAnalysis || []).find((b) => b.session_id === interview.id) as unknown as BehavioralAnalysisData | undefined
          if (behavior) {
            const physical = behavior.physical_metrics || []
            if (Array.isArray(physical) && physical.length > 0) {
              const avgBodyLanguage =
                physical.reduce((acc: number, item) => {
                  const score = item.bodyLanguageScore ?? item.posture_score ?? 0
                  return acc + score
                }, 0) / physical.length
              if (avgBodyLanguage >= 90) highBodyLanguageInterviews++
            }

            const speaking = behavior.speaking_analysis || {}
            const totalFiller = speaking.sessionSummary?.metrics?.totalFillerCount
            if (totalFiller === 0) zeroFillerWordInterviews++
            if (totalFiller !== undefined && totalFiller < 3) lowFillerWordInterviews++
          }

          const proctoring = typedInterview.proctoring_log || {}
          const violationsCount = proctoring.totalCount ?? 0
          if (violationsCount === 0 && !interview.is_flagged) zeroViolationInterviews++
        })

        let firstTrySolves = 0
        let perfectQualitySolves = 0
        let fastSolves = 0
        const jsAndPythonSolves = new Set<string>()
        let reposPushed = 0

        codingSolutions.forEach((sol) => {
          const session = codingSessions.find((s) => s.challenge_id === sol.challenge_id)
          if (sol.attempts === 1 && sol.test_results?.passed === sol.test_results?.total)
            firstTrySolves++
          if (sol.quality_score === 10) perfectQualitySolves++
          if (sol.language) jsAndPythonSolves.add(sol.language.toLowerCase())
          if (sol.github_repo_url) reposPushed++

          if (session) {
            const start = new Date(session.started_at).getTime()
            const end = new Date(session.submitted_at || sol.created_at).getTime()
            if (end - start < 5 * 60 * 1000) fastSolves++
          }
        })

        const hasSaturday = interviews.some((i) => new Date(i.created_at).getDay() === 6)
        const hasSunday = interviews.some((i) => new Date(i.created_at).getDay() === 0)

        const datesCount: Record<string, number> = {}
        const allActivityDates: Array<{ created_at?: string; started_at?: string }> = [
          ...interviews,
          ...codingSessions,
        ]
        allActivityDates.forEach((act) => {
          const dateStr = act.created_at || act.started_at
          if (!dateStr) return
          const d = new Date(dateStr)
            .toISOString()
            .split("T")[0]
          datesCount[d] = (datesCount[d] || 0) + 1
        })
        const maxActsInDay = Math.max(0, ...Object.values(datesCount))

        const maxInterviewsInDay = Math.max(
          0,
          ...Object.values(
            interviews.reduce<Record<string, number>>((acc, i) => {
              const day = new Date(i.created_at).toISOString().split("T")[0]
              acc[day] = (acc[day] || 0) + 1
              return acc
            }, {})
          )
        )

        stats = {
          mockCount,
          codingCount,
          streak,
          daysSinceSignup,
          hasUsername,
          hasAvatar,
          hasResume,
          hasGithub,
          totalPerfectScores,
          zeroFillerWordInterviews,
          highBodyLanguageInterviews,
          lowFillerWordInterviews,
          zeroViolationInterviews,
          firstTrySolves,
          perfectQualitySolves,
          fastSolves,
          jsAndPythonSolves,
          domainsCount: domains.size,
          maxConsecutiveHighScores,
          reposPushed,
          hasSaturday,
          hasSunday,
          maxActsInDay,
          maxInterviewsInDay,
        }
      } catch (err) {
        console.error("Failed to fetch detailed stats for badge progress:", err)
      }
    }
  }

  // Map to full Badge object structures
  const badgesList = DEFAULT_BADGES.map((b) => {
    const isEarned = earned.has(b.slug)
    const earnedAt = earnedDates[b.slug] || null

    const rawProgress = getBadgeProgress(b.slug, stats)
    const progress = isEarned
      ? { current: rawProgress.target, target: rawProgress.target }
      : {
          current: Math.min(rawProgress.current, rawProgress.target),
          target: rawProgress.target,
        }

    return {
      slug: b.slug,
      name: b.name,
      description: b.description,
      category: b.category,
      rarity: b.rarity,
      earned: isEarned,
      earnedAt,
      progress,
      rewardXP: getRewardXP(b.rarity),
    }
  })

  const total = DEFAULT_BADGES.length
  const earnedCount = badgesList.filter((b) => b.earned).length
  const commonCount = badgesList.filter((b) => b.rarity === "common" && b.earned).length
  const rareCount = badgesList.filter((b) => b.rarity === "rare" && b.earned).length
  const legendaryCount = badgesList.filter((b) => b.rarity === "legendary" && b.earned).length

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back + heading */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl text-foreground" style={headingStyle}>
          Achievements
        </h1>
        <p className="text-muted-foreground mt-1">
          Earn badges as you practice. Here&apos;s your full collection.
        </p>
      </div>

      {/* Main client gallery view */}
      <AchievementsGallery
        badges={badgesList}
        initialEarnedCount={earnedCount}
        totalBadgesCount={total}
        commonCount={commonCount}
        rareCount={rareCount}
        legendaryCount={legendaryCount}
      />
    </main>
  )
}
