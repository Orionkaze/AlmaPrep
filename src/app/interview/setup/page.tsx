"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBriefcase, faLaptopCode, faShuffle } from "@fortawesome/free-solid-svg-icons"

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-10">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Choose Your Interview</h1>
          <p className="text-foreground/60">Select the type of interview you&apos;d like to practice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelected(cat.id)} className="text-left">
              <GlassCard
                className={`h-full flex flex-col items-center text-center transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
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

        <div className="flex justify-center">
          <Link href={selected ? `/interview/${selected}` : "#"}>
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

