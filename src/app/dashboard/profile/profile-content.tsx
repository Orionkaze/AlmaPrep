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
  faSave
} from "@fortawesome/free-solid-svg-icons"
import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import { Input } from "@/components/ui/input"
import { updateUserProfile } from "@/app/actions/profile"
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
  }
  userEmail: string
  createdAt: string
  interviews: Interview[]
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
}: ProfileContentProps) {
  const [username, setUsername] = useState(initialProfile.username)
  const [selectedAvatar, setSelectedAvatar] = useState(initialProfile.avatar_url)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
                  <FontAwesomeIcon icon={faAward} /> Mockmate Prep Client
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
                <p className="text-xs text-foreground/40">Joined MockMate</p>
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
      </div>

      {/* Right Column: Performance and stats */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
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
