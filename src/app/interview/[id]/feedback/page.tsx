"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { use, useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faLightbulb } from "@fortawesome/free-solid-svg-icons"
import { getFeedback } from "@/app/actions/interview"

const categoryLabels: Record<string, string> = {
  hr: "HR Interview",
  technical: "Technical Interview",
  mixed: "Mixed Interview",
}

// Demo feedback data fallback
const demoFeedback = {
  score: 82,
  summary: "You demonstrated a solid understanding of core concepts and communicated your ideas clearly. Your answers were well-structured, and you showed confidence in explaining your thought process. There's room for improvement in providing more specific examples and technical depth.",
  strengths: [
    "Clear and concise communication",
    "Good problem-solving approach",
    "Confident delivery and composure",
  ],
  improvements: [
    "Provide more specific real-world examples",
    "Dive deeper into technical explanations",
    "Structure answers using the STAR method",
    "Reduce filler words and pauses",
  ],
  breakdown: [
    { label: "Communication", score: 85, color: "bg-primary" },
    { label: "Technical Knowledge", score: 78, color: "bg-secondary" },
    { label: "Problem Solving", score: 80, color: "bg-accent" },
    { label: "Confidence", score: 88, color: "bg-green-500" },
  ],
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#A855F7" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-[2000ms] ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-bold">{score}</p>
        <p className="text-xs text-foreground/50">out of 100</p>
      </div>
    </div>
  )
}

function ProgressBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-[1500ms] ease-out`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [feedback, setFeedback] = useState<typeof demoFeedback | null>(null)

  useEffect(() => {
    const loadFeedback = async () => {
      // 1. Try to fetch from Supabase if authenticated and id is a UUID
      if (id && id.length >= 36) {
        const dbFeedback = await getFeedback(id)
        if (dbFeedback) {
          setFeedback(dbFeedback)
          return
        }
      }

      // 2. Try to fetch from local storage
      const local = localStorage.getItem(`feedback-${id}`)
      if (local) {
        try {
          const parsed = JSON.parse(local)
          setFeedback(parsed)
          return
        } catch (e) {
          console.error("Failed to parse local feedback data:", e)
        }
      }

      // 3. Fallback to mock data
      setFeedback(demoFeedback)
    }

    loadFeedback()
  }, [id])

  if (!feedback) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="text-center z-10">
          <p className="text-lg font-medium animate-pulse">Analyzing interview transcript...</p>
        </div>
      </main>
    )
  }

  // Fallback category text
  const isUuid = id && id.length >= 36
  const categoryText = isUuid ? "Mock Interview" : (categoryLabels[id] ?? "Interview")

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Interview Feedback</h1>
          <p className="text-foreground/60">{categoryText} • Completed just now</p>
        </div>

        {/* Score Section */}
        <GlassCard className="flex flex-col items-center text-center mb-6 py-10">
          <h2 className="text-lg font-semibold text-foreground/70 mb-4">Overall Performance</h2>
          <ScoreCircle score={feedback.score} />
          <p className="text-foreground/70 mt-6 max-w-lg text-sm leading-relaxed">{feedback.summary}</p>
        </GlassCard>

        {/* Breakdown */}
        <GlassCard className="mb-6">
          <h2 className="text-lg font-semibold mb-5">Score Breakdown</h2>
          <div className="flex flex-col gap-5">
            {feedback.breakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-foreground/80">{item.label}</span>
                  <span className="font-semibold">{item.score}%</span>
                </div>
                <ProgressBar score={item.score} color={item.color} />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faCheck} className="text-green-500" />
              </span>
              Strengths
            </h2>
            <ul className="flex flex-col gap-3">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="mt-0.5 size-1.5 rounded-full bg-green-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faLightbulb} className="text-amber-500" />
              </span>
              Improvements
            </h2>
            <ul className="flex flex-col gap-3">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="mt-0.5 size-1.5 rounded-full bg-amber-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/interview/setup">
            <GlowButton className="h-12 px-10 cursor-pointer">Start Another Interview</GlowButton>
          </Link>
          <Link href="/dashboard">
            <button className="h-12 px-10 rounded-lg text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
