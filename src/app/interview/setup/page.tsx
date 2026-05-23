"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBriefcase, faLaptopCode, faShuffle, faFileLines } from "@fortawesome/free-solid-svg-icons"
import { getResumeData } from "@/app/actions/resume"

const categories = [
  {
    id: "hr",
    label: "HR Interview",
    icon: faBriefcase,
    description: "Behavioral questions, teamwork, leadership, and situational scenarios.",
    gradient: "from-primary to-primary/60",
  },
  {
    id: "technical",
    label: "Technical Interview",
    icon: faLaptopCode,
    description: "Data structures, algorithms, system design, and problem-solving.",
    gradient: "from-secondary to-secondary/60",
  },
  {
    id: "mixed",
    label: "Mixed Interview",
    icon: faShuffle,
    description: "A blend of HR and technical questions simulating a real-world interview.",
    gradient: "from-accent to-accent/60",
  },
]

export default function InterviewSetupPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [hasResume, setHasResume] = useState(false)
  const [useResume, setUseResume] = useState(false)
  const [persona, setPersona] = useState<string>("supportive")

  useEffect(() => {
    async function checkResume() {
      const result = await getResumeData()
      if (result.success && result.data && result.data.resumeText) {
        setHasResume(true)
      }
    }
    checkResume()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl pt-10">
        <div className="text-center mb-10">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-4 inline-block font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Choose Your Interview</h1>
          <p className="text-foreground/60">Select the type of interview you&apos;d like to practice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelected(cat.id)} className="text-left cursor-pointer">
              <GlassCard
                className={`h-full flex flex-col items-center text-center transition-all duration-200 hover:scale-[1.02] ${
                  selected === cat.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "hover:border-white/20"
                }`}
              >
                <div className={`size-16 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-4 opacity-90`}>
                  <FontAwesomeIcon icon={cat.icon} className="text-2xl text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{cat.label}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{cat.description}</p>
              </GlassCard>
            </button>
          ))}
        </div>

        {/* Persona Selector */}
        <GlassCard className="p-5 mb-4 border-white/10">
          <h4 className="text-sm font-semibold mb-3 text-foreground/90">Select Recruiter Persona</h4>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "supportive", label: "Supportive", desc: "Warm and encouraging" },
              { id: "strict", label: "Strict", desc: "Cold and highly formal" },
              { id: "roast", label: "Roast Mode 💀", desc: "Brutally honest & sarcastic" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`flex-1 min-w-[120px] p-3 rounded-xl border text-left transition-all ${
                  persona === p.id 
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30" 
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div className="text-sm font-bold mb-1">{p.label}</div>
                <div className="text-xs text-foreground/50">{p.desc}</div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Resume Toggle Box */}
        <GlassCard className="p-5 mb-8 border-dashed border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-foreground/90">
              <FontAwesomeIcon icon={faFileLines} className="text-primary text-xs" /> Resume-Focused Questions
            </h4>
            {hasResume ? (
              <p className="text-xs text-foreground/50 leading-relaxed">
                Saved resume detected! Enable this option to have Gemini ask questions tailored specifically to your background and projects.
              </p>
            ) : (
              <p className="text-xs text-foreground/50 leading-relaxed">
                You haven&apos;t added a resume yet. To practice questions based on your background, configure your profile in the{" "}
                <Link href="/dashboard/resume" className="text-primary hover:underline font-semibold">
                  Resume Analyzer
                </Link>
                .
              </p>
            )}
          </div>
          {hasResume && (
            <button
              onClick={() => setUseResume(!useResume)}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <span className="text-xs font-bold text-foreground/80">{useResume ? "Enabled" : "Disabled"}</span>
              <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${useResume ? "bg-primary" : "bg-white/10 border border-white/5"}`}>
                <div className={`bg-white size-4 rounded-full shadow-md transform transition-all duration-300 ${useResume ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>
          )}
        </GlassCard>

        <div className="flex justify-center pb-10">
          <Link href={selected ? `/interview/${selected}?resume=${useResume}&persona=${persona}` : "#"}>
            <GlowButton
              disabled={!selected}
              className={`h-12 px-12 text-base ${!selected ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Begin Interview →
            </GlowButton>
          </Link>
        </div>
      </div>
    </main>
  )
}


