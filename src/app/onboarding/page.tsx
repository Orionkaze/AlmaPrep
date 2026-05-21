"use client"

import { GlowButton } from "@/components/ui/glow-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faLaptopCode, faUserTie, faRocket, faBrain, faStar } from "@fortawesome/free-solid-svg-icons"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createUserProfile } from "@/app/actions/profile"

const avatars = [faLaptopCode, faUserTie, faRocket, faBrain, faStar]
const avatarNames = ["laptop-code", "user-tie", "rocket", "brain", "star"]

export default function OnboardingPage() {
  const [username, setUsername] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // If guest/demo session, redirect to dashboard
    if (document.cookie.includes("mockmate-demo-session=true")) {
      router.push("/dashboard")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)

    const result = await createUserProfile(username.trim(), avatarNames[selectedAvatar])

    if (result.success) {
      router.push("/dashboard")
      router.refresh()
    } else {
      setError(result.error || "An error occurred while creating your profile.")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Almost there!</h1>
          <p className="text-foreground/70">Let&apos;s set up your profile.</p>
        </div>

        <GlassCard className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground/90">Choose a Username</label>
              <Input
                id="username"
                type="text"
                placeholder="interview_pro"
                className="input-glass h-12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-xs text-foreground/50 mt-1">This will be displayed on your dashboard.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground/90">Select an Avatar</label>
              <div className="flex gap-4 flex-wrap justify-center sm:justify-start">
                {avatars.map((icon, i) => {
                  const isSelected = selectedAvatar === i
                  return (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => setSelectedAvatar(i)}
                      className={`size-16 rounded-full bg-input/50 border flex items-center justify-center text-xl transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 text-primary"
                          : "border-border hover:border-primary/60 text-foreground/80"
                      }`}
                    >
                      <FontAwesomeIcon icon={icon} />
                    </button>
                  )
                })}
              </div>
            </div>

            <GlowButton type="submit" disabled={loading} className="w-full mt-4 h-12 cursor-pointer">
              {loading ? "Completing Setup..." : "Complete Setup"}
            </GlowButton>
          </form>
        </GlassCard>
      </div>
    </main>
  )
}
