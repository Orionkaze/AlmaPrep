"use client"

import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faLaptopCode,
  faUserTie,
  faRocket,
  faBrain,
  faStar,
  faEnvelope,
  faCalendarAlt,
  faCheckCircle,
  faAward,
  faChartBar,
  faBullseye,
  faFire,
  faUserEdit,
  faSave,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faSync
} from "@fortawesome/free-solid-svg-icons"
import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import { Input } from "@/components/ui/input"
import { updateUserProfile, clearAllUserData, updateGithubAutosave } from "@/app/actions/profile"
import { signOut } from "next-auth/react"
import Link from "next/link"

const avatarMap: Record<string, typeof faUserTie> = {
  "laptop-code": faLaptopCode,
  "user-tie": faUserTie,
  "rocket": faRocket,
  "brain": faBrain,
  "star": faStar,
}

const avatars = [
  { name: "laptop-code", icon: faLaptopCode },
  { name: "user-tie", icon: faUserTie },
  { name: "rocket", icon: faRocket },
  { name: "brain", icon: faBrain },
  { name: "star", icon: faStar },
]

interface Interview {
  id: string
  category: string
  score: number
  date: string
  status: string
}

interface ProfileContentProps {
  initialProfile: {
    username: string
    avatar_url: string
    resume_text?: string
    github_autosave?: boolean
  }
  userEmail: string
  createdAt: string
  interviews: Interview[]
  subscriptionTier: string
  hasGitHubToken: boolean
  initialGitHubAnalysis: any
}

function ScoreRing({ score }: { score: number }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold">{score}</span>
    </div>
  )
}

export default function ProfileContent({
  initialProfile,
  userEmail,
  createdAt,
  interviews,
  subscriptionTier,
  hasGitHubToken,
  initialGitHubAnalysis,
}: ProfileContentProps) {
  const [username, setUsername] = useState(initialProfile.username)
  const [selectedAvatar, setSelectedAvatar] = useState(initialProfile.avatar_url)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // GitHub Analysis states
  const [githubAnalysis, setGithubAnalysis] = useState<any>(initialGitHubAnalysis)
  const [analyzingGitHub, setAnalyzingGitHub] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null)

  const handleAnalyzeGitHub = async () => {
    setAnalyzingGitHub(true)
    setGithubError(null)

    try {
      const res = await fetch("/api/github-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: true })
      })

      const data = await res.json()
      if (res.ok && data.result) {
        setGithubAnalysis(data.result)
      } else {
        throw new Error(data.error || "Failed to analyze GitHub profile.")
      }
    } catch (err: any) {
      console.error(err)
      setGithubError(err.message || "An unexpected error occurred while analyzing GitHub profile.")
    } finally {
      setAnalyzingGitHub(false)
    }
  }

  const handleGitHubRedirectLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Supabase signOut error:", err)
    }

    document.cookie = "mockmate-demo-session=; path=/; max-age=0"
    document.cookie = "mockmate-demo-user=; path=/; max-age=0"
    document.cookie = "mockmate-demo-resume=; path=/; max-age=0"

    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Call server action to clear DB rows and cookies
      await clearAllUserData()

      // 2. Clear client-side localStorage
      localStorage.removeItem("mockmate_users")
      
      // Remove all feedback keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("feedback-") || key.startsWith("mockmate-") || key === "mockmate_users")) {
          localStorage.removeItem(key)
        }
      }

      // 3. Clear guest cookies in document
      document.cookie = "mockmate-demo-session=; path=/; max-age=0"
      document.cookie = "mockmate-demo-user=; path=/; max-age=0"
      document.cookie = "mockmate-demo-resume=; path=/; max-age=0"

      // 4. Sign out
      try {
        await signOut({ redirect: false })
        window.location.href = "/"
      } catch (e) {
        window.location.href = "/"
      }
    } catch (err) {
      console.error("Failed to delete account:", err)
      setError("Failed to delete account. Please try again.")
      setIsDeleting(false)
    }
  }

  // Calculate statistics
  const totalSessions = interviews.length
  const avgScore = totalSessions > 0
    ? Math.round(interviews.reduce((sum, h) => sum + h.score, 0) / totalSessions)
    : 0
  const bestScore = totalSessions > 0
    ? Math.max(...interviews.map(h => h.score))
    : 0

  // Profile completion calculation
  let completionPercentage = 25 // base email confirmed
  if (initialProfile.username) completionPercentage += 25
  if (initialProfile.avatar_url) completionPercentage += 25
  if (initialProfile.resume_text) completionPercentage += 25

  // Format date
  const joinDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await updateUserProfile(username.trim(), selectedAvatar)

    if (result.success) {
      setSuccess("Profile updated successfully!")
      setIsEditing(false)
      // Force refresh current layout
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      setError(result.error || "Failed to update profile")
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Settings and details */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <GlassCard className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
            <div className="size-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary text-4xl mb-4 relative shadow-lg shadow-primary/10">
              <FontAwesomeIcon icon={avatarMap[selectedAvatar] || faUserTie} />
              <div className="absolute -bottom-1 -right-1 bg-green-500 border border-background size-4 rounded-full" />
            </div>

            {isEditing ? (
              <div className="w-full flex flex-col gap-4 mt-2">
                <div className="flex flex-col text-left gap-1">
                  <label className="text-xs text-foreground/50 font-medium">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-10 text-center text-sm input-glass"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-foreground/50 font-medium text-left">Choose Avatar</label>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {avatars.map((av) => (
                      <button
                        key={av.name}
                        onClick={() => setSelectedAvatar(av.name)}
                        className={`size-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          selectedAvatar === av.name
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border hover:border-foreground/50 text-foreground/60"
                        }`}
                      >
                        <FontAwesomeIcon icon={av.icon} className="text-sm" />
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                
                <div className="flex gap-2 justify-center mt-2">
                  <button
                    onClick={() => {
                      setUsername(initialProfile.username)
                      setSelectedAvatar(initialProfile.avatar_url)
                      setIsEditing(false)
                      setError(null)
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/10 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <GlowButton onClick={handleSave} disabled={loading} className="h-8 px-4 text-xs">
                    <FontAwesomeIcon icon={faSave} className="mr-1.5" />
                    {loading ? "Saving..." : "Save"}
                  </GlowButton>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-1">{initialProfile.username}</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4 uppercase">
                  <FontAwesomeIcon icon={faAward} /> {subscriptionTier} Tier
                </div>
                <GlowButton onClick={() => setIsEditing(true)} className="h-8 px-4 text-xs">
                  <FontAwesomeIcon icon={faUserEdit} className="mr-1.5" /> Edit Profile
                </GlowButton>
              </>
            )}
            {success && <p className="text-xs text-green-400 mt-3">{success}</p>}
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <div className="flex items-center gap-3 text-sm text-foreground/75">
              <FontAwesomeIcon icon={faEnvelope} className="text-foreground/40 w-4" />
              <div>
                <p className="text-xs text-foreground/40">Email Address</p>
                <p className="font-medium">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground/75">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-foreground/40 w-4" />
              <div>
                <p className="text-xs text-foreground/40">Joined Almaprep</p>
                <p className="font-medium">{joinDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground/75">
              <FontAwesomeIcon icon={faCheckCircle} className="text-foreground/40 w-4" />
              <div className="flex-1">
                <p className="text-xs text-foreground/40">Resume Status</p>
                <p className="font-medium text-foreground">
                  {initialProfile.resume_text ? (
                    <span className="text-green-400 font-semibold">Saved & Analyzed</span>
                  ) : (
                    <span className="text-foreground/50 font-semibold">
                      Not Added (
                      <Link href="/dashboard/resume" className="text-primary hover:underline">
                        Upload Now
                      </Link>
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Profile Completion */}
        <GlassCard className="p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>Profile Completion</span>
            <span className="text-primary">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-1000"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <ul className="text-xs text-foreground/60 space-y-2 mt-1">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Email verified
            </li>
            <li className="flex items-center gap-2">
              <span className={initialProfile.username ? "text-green-400" : "text-foreground/35"}>
                {initialProfile.username ? "✓" : "○"}
              </span>{" "}
              Username set
            </li>
            <li className="flex items-center gap-2">
              <span className={initialProfile.avatar_url ? "text-green-400" : "text-foreground/35"}>
                {initialProfile.avatar_url ? "✓" : "○"}
              </span>{" "}
              Avatar chosen
            </li>
            <li className="flex items-center gap-2">
              <span className={initialProfile.resume_text ? "text-green-400" : "text-foreground/35"}>
                {initialProfile.resume_text ? "✓" : "○"}
              </span>{" "}
              Resume analyzer configured
            </li>
          </ul>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="p-5 border-red-500/20 hover:border-red-500/40 transition-all flex flex-col gap-3 relative overflow-hidden bg-red-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Danger Zone</h3>
          <p className="text-xs text-foreground/75 leading-relaxed">
            Permanently delete all your account data, profile details, resumes, interview transcripts, and performance analytics. This action is irreversible.
          </p>
          
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20 mt-1">
              <p className="text-xs font-bold text-red-400 leading-snug">Are you absolutely sure? All your data will be permanently wiped.</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 hover:bg-white/5 cursor-pointer text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors"
                >
                  {isDeleting ? "Deleting..." : "Yes, delete everything"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:text-white hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer text-center"
            >
              Delete account
            </button>
          )}
        </GlassCard>
      </div>

      {/* Right Column: Performance and stats */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-primary/20 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <FontAwesomeIcon icon={faChartBar} className="text-primary text-lg" />
            <div>
              <p className="text-2xl font-black tracking-tight">{avgScore}</p>
              <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Avg Score</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-secondary/20 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <FontAwesomeIcon icon={faBullseye} className="text-secondary text-lg" />
            <div>
              <p className="text-2xl font-black tracking-tight">{totalSessions}</p>
              <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Total Runs</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-accent/20 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <FontAwesomeIcon icon={faFire} className="text-accent text-lg" />
            <div>
              <p className="text-2xl font-black tracking-tight">{bestScore}</p>
              <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Top Score</p>
            </div>
          </GlassCard>
        </div>

        {/* GitHub Project Analyzer Card */}
        <GlassCard className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-white">
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">GitHub Project Analyzer</h3>
              <p className="text-xs text-foreground/50">Tailor your coding questions to your actual repositories</p>
            </div>
          </div>

          {!githubAnalysis ? (
            // State A: No analysis generated yet
            <div className="py-2">
              <p className="text-sm text-foreground/75 mb-4 leading-relaxed">
                Connect your GitHub account to analyze your codebase (technologies, coding style, commit history) and generate custom-tailored interview questions directly for your projects.
              </p>
              
              {!hasGitHubToken ? (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-foreground/60 mb-3">
                    Your account is not connected to GitHub. Connect via GitHub during login to enable this.
                  </p>
                  <button 
                    onClick={handleGitHubRedirectLogout}
                    className="px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Go to Login & Connect GitHub
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <GlowButton 
                    onClick={handleAnalyzeGitHub} 
                    disabled={analyzingGitHub} 
                    className="h-10 w-full text-sm font-semibold"
                  >
                    {analyzingGitHub ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                        Fetching & Analyzing Repositories...
                      </>
                    ) : (
                      "Run AI Codebase Analysis"
                    )}
                  </GlowButton>
                  {githubError && <p className="text-xs text-red-400 text-center mt-1">{githubError}</p>}
                </div>
              )}
            </div>
          ) : (
            // State B: Analysis results generated
            <div className="flex flex-col gap-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Coding Profile Summary</h4>
                  {hasGitHubToken && (
                    <button
                      onClick={handleAnalyzeGitHub}
                      disabled={analyzingGitHub}
                      className="text-xs text-foreground/45 hover:text-foreground/75 flex items-center gap-1 cursor-pointer disabled:opacity-50 border-0 bg-transparent"
                      title="Re-run analysis"
                    >
                      <FontAwesomeIcon icon={faSync} className={analyzingGitHub ? "animate-spin" : ""} />
                      {analyzingGitHub ? "Refreshing..." : "Refresh"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {githubAnalysis.profile_summary}
                </p>
              </div>

              {/* Tech Stack */}
              <div>
                <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Primary Tech Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {githubAnalysis.tech_stack?.map((tech: string) => (
                    <span 
                      key={tech} 
                      className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Design Patterns */}
              {githubAnalysis.design_patterns && githubAnalysis.design_patterns.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Detected Design Patterns</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {githubAnalysis.design_patterns.map((pattern: string) => (
                      <span 
                        key={pattern} 
                        className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {githubAnalysis.strengths && githubAnalysis.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Key Strengths</h4>
                  <ul className="text-xs text-foreground/75 space-y-1.5 pl-1">
                    {githubAnalysis.strengths.map((strength: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✦</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weak Areas to Improve */}
              {githubAnalysis.weak_areas && githubAnalysis.weak_areas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Areas to Improve</h4>
                  <ul className="text-xs text-foreground/75 space-y-1.5 pl-1">
                    {githubAnalysis.weak_areas.map((weak: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">⚠️</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tailored Questions per Repo */}
              {githubAnalysis.questions && githubAnalysis.questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-2">Tailored Interview Questions</h4>
                  
                  {/* Group questions by repository */}
                  <div className="flex flex-col gap-2">
                    {Array.from(new Set(githubAnalysis.questions.map((q: any) => q.repo))).map((repoName: any) => {
                      const repoQuestions = githubAnalysis.questions.filter((q: any) => q.repo === repoName)
                      const isExpanded = expandedRepo === repoName

                      return (
                        <div 
                          key={repoName} 
                          className="border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedRepo(isExpanded ? null : repoName)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer text-left text-sm font-semibold text-foreground/95 border-0 bg-transparent"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate">{repoName}</span>
                              {githubAnalysis.repo_metadata?.[repoName]?.complexity_score !== undefined && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold shrink-0">
                                  Complexity: {githubAnalysis.repo_metadata[repoName].complexity_score}/10
                                </span>
                              )}
                            </div>
                            <FontAwesomeIcon 
                              icon={isExpanded ? faChevronUp : faChevronDown} 
                              className="text-xs text-foreground/45 shrink-0" 
                            />
                          </button>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 flex flex-col gap-4 border-t border-white/5 bg-white/[0.005]">
                              {/* Repo specific patterns & weak areas */}
                              {githubAnalysis.repo_metadata?.[repoName] && (
                                <div className="flex flex-col gap-2 pt-1 pb-1 text-xs border-b border-white/5">
                                  {githubAnalysis.repo_metadata[repoName].design_patterns?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      <span className="text-foreground/50 font-medium mr-1 text-[11px]">Patterns:</span>
                                      {githubAnalysis.repo_metadata[repoName].design_patterns.map((pat: string) => (
                                        <span key={pat} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-semibold">
                                          {pat}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {githubAnalysis.repo_metadata[repoName].weak_areas?.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1 text-[11px]">
                                      <span className="text-foreground/50 font-medium">Repo Weak Areas:</span>
                                      {githubAnalysis.repo_metadata[repoName].weak_areas.map((weak: string, wi: number) => (
                                        <span key={wi} className="text-red-400/90 pl-1 leading-normal">
                                          ⚠️ {weak}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-col gap-3">
                                {repoQuestions.map((q: any, i: number) => (
                                  <div key={i} className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        q.difficulty === "easy" 
                                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                          : q.difficulty === "medium"
                                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                                      }`}>
                                        {q.difficulty}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                      {q.question}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {githubError && <p className="text-xs text-red-400 text-center mt-1">{githubError}</p>}
            </div>
          )}
        </GlassCard>

        {/* History Log */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold mb-4">Interview History & Analytics</h3>

          {totalSessions > 0 ? (
            <div className="flex flex-col gap-4 max-h-[460px] overflow-y-auto pr-1">
              {interviews.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0 hover:bg-white/[0.01] p-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <ScoreRing score={session.score} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm capitalize">{session.category} Interview</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-foreground/60 font-medium">
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/40">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Link href={`/interview/${session.id}/feedback`}>
                    <button className="text-xs font-semibold text-primary hover:underline whitespace-nowrap cursor-pointer">
                      View Feedback →
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <FontAwesomeIcon icon={faLaptopCode} className="text-foreground/30 text-lg" />
              </div>
              <p className="text-sm text-foreground/50 mb-4">No interviews logged yet.</p>
              <Link href="/interview/setup">
                <GlowButton className="h-9 px-6 text-xs">Start Practicing</GlowButton>
              </Link>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
