import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMicrophone, faChartBar, faBullseye, faFire } from "@fortawesome/free-solid-svg-icons"

// Mock data for demo purposes
const mockHistory = [
  { id: "1", category: "Technical", score: 82, date: "2025-05-19", status: "completed" },
  { id: "2", category: "HR", score: 91, date: "2025-05-17", status: "completed" },
  { id: "3", category: "Mixed", score: 76, date: "2025-05-14", status: "completed" },
]

function ScoreRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold">{score}</span>
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Technical: "bg-primary/10 text-primary border-primary/20",
    HR: "bg-secondary/10 text-secondary border-secondary/20",
    Mixed: "bg-accent/10 text-accent border-accent/20",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${colors[category] ?? colors.Mixed}`}>
      {category}
    </span>
  )
}

export default function DashboardPage() {
  const avgScore = Math.round(mockHistory.reduce((sum, h) => sum + h.score, 0) / mockHistory.length)

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-4 inline-block">
              Mock Mate
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Welcome back, <span className="text-primary">User</span>
            </h1>
            <p className="text-foreground/60 mt-1">Ready for your next interview session?</p>
          </div>
          <Link href="/interview/setup">
            <GlowButton className="h-12 px-10 text-base cursor-pointer">
              <FontAwesomeIcon icon={faMicrophone} className="mr-2" /> Start Interview
            </GlowButton>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <GlassCard className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faChartBar} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Average Score</p>
              <p className="text-2xl font-bold text-primary">{avgScore}/100</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-secondary/20 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faBullseye} className="text-secondary" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Total Sessions</p>
              <p className="text-2xl font-bold text-secondary">{mockHistory.length}</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-accent/20 flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faFire} className="text-accent" />
            </div>
            <div>
              <p className="text-sm text-foreground/60">Best Score</p>
              <p className="text-2xl font-bold text-accent">{Math.max(...mockHistory.map(h => h.score))}/100</p>
            </div>
          </GlassCard>
        </div>

        {/* Interview History */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Interview History</h2>
          <div className="flex flex-col gap-4">
            {mockHistory.map((session) => (
              <GlassCard key={session.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-6">
                  <ScoreRing score={session.score} />
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{session.category} Interview</h3>
                      <CategoryBadge category={session.category} />
                    </div>
                    <p className="text-sm text-foreground/50">{new Date(session.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <Link href={`/interview/${session.id}/feedback`}>
                  <button className="text-sm font-medium text-primary hover:underline whitespace-nowrap cursor-pointer">
                    View Feedback →
                  </button>
                </Link>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Empty state (hidden when there's data) */}
        {mockHistory.length === 0 && (
          <GlassCard className="text-center py-16">
            <FontAwesomeIcon icon={faMicrophone} className="text-5xl text-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No interviews yet</h3>
            <p className="text-foreground/60 mb-6">Start your first mock interview and track your progress.</p>
            <Link href="/interview/setup">
              <GlowButton>Start Your First Interview</GlowButton>
            </Link>
          </GlassCard>
        )}
      </div>
    </main>
  )
}

