import { GlowButton } from "@/components/ui/glow-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faLaptopCode, faUserTie, faRocket, faBrain, faStar } from "@fortawesome/free-solid-svg-icons"

const avatars = [faLaptopCode, faUserTie, faRocket, faBrain, faStar]

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Almost there!</h1>
          <p className="text-foreground/70">Let's set up your profile.</p>
        </div>

        <GlassCard className="p-8">
          <form className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground/90">Choose a Username</label>
              <Input id="username" type="text" placeholder="interview_pro" className="input-glass h-12" required />
              <p className="text-xs text-foreground/50 mt-1">This will be displayed on your dashboard.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground/90">Select an Avatar</label>
              <div className="flex gap-4 flex-wrap justify-center sm:justify-start">
                {/* Dummy avatars for UI */}
                {avatars.map((icon, i) => (
                  <button 
                    key={i}
                    type="button"
                    className="size-16 rounded-full bg-input/50 border border-border hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary flex items-center justify-center text-xl transition-all cursor-pointer"
                  >
                    <FontAwesomeIcon icon={icon} className="text-foreground/80" />
                  </button>
                ))}
              </div>
            </div>

            <GlowButton type="submit" className="w-full mt-4 h-12">
              Complete Setup
            </GlowButton>
          </form>
        </GlassCard>
      </div>
    </main>
  )
}

