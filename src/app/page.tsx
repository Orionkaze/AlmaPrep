import { GlowButton } from "@/components/ui/glow-button"
import { GlassCard } from "@/components/ui/glass-card"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRobot, faBolt, faChartLine } from "@fortawesome/free-solid-svg-icons"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-5xl flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
          Master Your Next <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Mock Interview
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-12">
          Experience realistic AI-driven mock interviews with instant feedback. Build confidence and communication skills in a safe, futuristic environment.
        </p>

        <div className="flex gap-4">
          <Link href="/login">
            <GlowButton>Get Started</GlowButton>
          </Link>
          <Link href="/dashboard">
            <button className="h-10 px-8 py-2 rounded-lg text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              Dashboard
            </button>
          </Link>
        </div>
      </div>

      <div className="z-10 mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <GlassCard className="flex flex-col items-center text-center">
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faRobot} className="text-lg text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Realistic AI</h3>
          <p className="text-foreground/70 text-sm">Context-aware conversational interviews tailored to HR and Technical roles.</p>
        </GlassCard>
        
        <GlassCard className="flex flex-col items-center text-center">
          <div className="size-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faBolt} className="text-lg text-secondary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Instant Feedback</h3>
          <p className="text-foreground/70 text-sm">Get immediate performance scores and actionable suggestions.</p>
        </GlassCard>

        <GlassCard className="flex flex-col items-center text-center">
          <div className="size-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faChartLine} className="text-lg text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
          <p className="text-foreground/70 text-sm">Monitor your interview history and watch your confidence grow.</p>
        </GlassCard>
      </div>
    </main>
  )
}

