export interface BadgeStats {
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

export function calculateDaysSinceSignup(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24))
}

export function getRewardXP(rarity: string): number {
  if (rarity === "legendary") return 250
  if (rarity === "rare") return 100
  return 50
}

export function getBadgeProgress(slug: string, stats: BadgeStats): { current: number; target: number } {
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
