// Row shapes for the Supabase tables in `database_schema.sql` + `db_setup_badges.sql`.
// Hand-maintained (no generated `supabase gen types` output exists in this repo yet).
// Keep in sync with those two files when the schema changes.

export interface UserRow {
  id: string
  username: string | null
  avatar_url: string | null
  resume_text: string | null
  resume_analysis: Record<string, unknown> | null
  subscription_tier: string
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  github_autosave: boolean
  created_at: string
}

export interface InterviewRow {
  id: string
  user_id: string
  category: string
  status: string
  use_resume: boolean
  mode: string
  selected_repos: string[]
  proctoring_log: Record<string, unknown> | null
  is_flagged: boolean
  created_at: string
}

export interface MessageRow {
  id: string
  interview_id: string
  role: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface FeedbackDetailedMetrics {
  fillerWords?: number
  bodyLanguageScore?: number
  violations?: number
  [key: string]: unknown
}

export interface FeedbackRow {
  id: string
  interview_id: string
  score: number
  summary: string
  improvement_suggestions: string[]
  detailed_metrics?: FeedbackDetailedMetrics | null
  created_at: string
}

export interface InterviewUsageRow {
  user_id: string
  month: string
  count: number
}

export interface ChallengeRow {
  id: string
  title: string
  description: string
  challenge_type: "bug_fix" | "feature" | "refactor" | "security" | "performance"
  difficulty: "easy" | "medium" | "hard"
  language: string
  starter_code: Record<string, unknown>
  hidden_tests: Record<string, unknown>
  expected_outcomes: Record<string, unknown>
  created_at: string
}

export interface InterviewSessionRow {
  id: string
  user_id: string
  challenge_id: string
  conversation: Array<Record<string, unknown>>
  current_codebase: Record<string, unknown> | null
  submitted_code: Record<string, unknown> | null
  status: "in_progress" | "submitted" | "evaluated"
  started_at: string
  submitted_at: string | null
}

export interface TestResults {
  passed: number
  total: number
  [key: string]: unknown
}

export interface CodingSolutionRow {
  id: string
  user_id: string
  challenge_id: string
  challenge_slug: string
  language: string
  solution_code: string
  test_results: TestResults
  logic_score: number
  quality_score: number
  attempts: number
  github_repo_url: string | null
  github_repo_name: string | null
  created_at: string
}

export interface InterviewReportRow {
  id: string
  session_id: string
  user_id: string
  scores: Record<string, number>
  strengths: string[] | null
  weaknesses: string[] | null
  hiring_recommendation: string | null
  recommendation_reasoning: string | null
  overall_score: number | null
  test_results: TestResults | null
  generated_at: string
}

export interface GithubAnalysisRow {
  user_id: string
  profile_summary: string
  tech_stack: string[]
  strengths: string[]
  questions: Array<{ repo: string; question: string; difficulty: string }>
  design_patterns: string[]
  weak_areas: string[]
  repo_metadata: Record<string, unknown>
  created_at: string
}

export interface BehavioralAnalysisRow {
  id: string
  user_id: string
  session_id: string
  answer_scores: Array<Record<string, unknown>>
  physical_metrics: Array<Record<string, unknown>>
  speaking_analysis: Record<string, unknown> | null
  final_report: string
  created_at: string
}

export interface ActivityLogRow {
  id: string
  user_id: string
  activity_type: "interview" | "coding_challenge"
  activity_id: string
  activity_date: string
  created_at: string
}

export interface BadgeRow {
  id: string
  slug: string
  name: string
  description: string
  category: "getting_started" | "streak" | "interview" | "coding" | "skill" | "progress" | "special"
  icon: string
  rarity: "common" | "rare" | "legendary"
  created_at: string
}

export interface UserBadgeRow {
  id: string
  user_id: string
  badge_slug: string
  earned_at: string
}

// Joined shapes used by server actions that select relations inline.
export type InterviewWithFeedback = InterviewRow & { feedback: FeedbackRow[] }
export type SessionWithSolutionsAndReports = InterviewSessionRow & {
  coding_solutions: CodingSolutionRow[]
  interview_reports: InterviewReportRow[]
}
