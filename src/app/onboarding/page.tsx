"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Laptop, UserRound, Rocket, Brain, Star, ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { createUserProfile, checkUsernameAvailability } from "@/app/actions/profile"
import Link from "next/link"
import { track, EVENTS } from "@/lib/analytics"

const avatars = [
  { icon: Laptop, name: "laptop-code" },
  { icon: UserRound, name: "user-tie" },
  { icon: Rocket, name: "rocket" },
  { icon: Brain, name: "brain" },
  { icon: Star, name: "star" },
]

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default function OnboardingPage() {
  const [username, setUsername] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<"available" | "taken" | "invalid" | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Real-time debounced username validation
  useEffect(() => {
    const trimmed = username.trim()
    if (!trimmed) {
      setAvailability(null)
      setValidationMessage(null)
      setChecking(false)
      return
    }

    if (trimmed.length < 2) {
      setAvailability("invalid")
      setValidationMessage("Username must be at least 2 characters.")
      setChecking(false)
      return
    }

    if (trimmed.length > 40) {
      setAvailability("invalid")
      setValidationMessage("Username must be under 40 characters.")
      setChecking(false)
      return
    }

    // Only alphanumeric, hyphens, and underscores
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(trimmed)) {
      setAvailability("invalid")
      setValidationMessage("Only letters, numbers, underscores (_), and hyphens (-) allowed.")
      setChecking(false)
      return
    }

    setChecking(true)
    setAvailability(null)
    setValidationMessage(null)

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmed)
        if (result.available) {
          setAvailability("available")
          setValidationMessage("Username is available")
        } else {
          setAvailability("taken")
          setValidationMessage(result.error || "This username is already taken.")
        }
      } catch (err) {
        setAvailability("invalid")
        setValidationMessage("Failed to check username availability.")
      } finally {
        setChecking(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || checking || availability !== "available") return

    setLoading(true)
    setError(null)

    const result = await createUserProfile(username.trim(), avatars[selectedAvatar].name)

    if (result.success) {
      track(EVENTS.ONBOARDING_COMPLETED, { avatar: avatars[selectedAvatar].name, skipped: false })
      window.location.href = "/dashboard"
    } else {
      setError(result.error || "An error occurred while creating your profile.")
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    setError(null)

    const result = await createUserProfile("User", "user-tie")

    if (result.success) {
      track(EVENTS.ONBOARDING_COMPLETED, { avatar: "user-tie", skipped: true })
      window.location.href = "/dashboard"
    } else {
      setError(result.error || "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center pt-8 sm:pt-12 pb-12 px-4 sm:px-6 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-[440px] flex flex-col">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-semibold self-start"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to login
        </Link>
 
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground" style={headingStyle}>Almost there!</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Let&apos;s set up your profile to start practicing.</p>
        </div>
 
        <Card className="shadow-xl rounded-2xl border border-border bg-card overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}
 
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Username Input Container */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="username" className="text-xs sm:text-sm font-semibold text-foreground">Choose a Username</label>
                  {/* Status Indicator */}
                  <div className="h-5 flex items-center">
                    {checking && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Loader2 className="size-3 animate-spin text-primary" />
                        Checking...
                      </span>
                    )}
                    {!checking && availability === "available" && (
                      <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="size-3 text-emerald-500 fill-emerald-500/10" />
                        Available
                      </span>
                    )}
                    {!checking && availability === "taken" && (
                      <span className="text-[11px] text-rose-500 flex items-center gap-1 font-semibold">
                        <XCircle className="size-3 text-rose-500 fill-rose-500/10" />
                        Taken
                      </span>
                    )}
                    {!checking && availability === "invalid" && (
                      <span className="text-[11px] text-amber-500 flex items-center gap-1 font-semibold">
                        <XCircle className="size-3 text-amber-500 fill-amber-500/10" />
                        Invalid
                      </span>
                    )}
                  </div>
                </div>

                <Input
                  id="username"
                  type="text"
                  placeholder="interview_pro"
                  className={`h-11 sm:h-12 border rounded-xl text-sm sm:text-base transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-primary/20 ${
                    availability === "available" ? "border-emerald-500/50 focus-visible:border-emerald-500" :
                    availability === "taken" ? "border-rose-500/50 focus-visible:border-rose-500" :
                    availability === "invalid" ? "border-amber-500/50 focus-visible:border-amber-500" :
                    "border-border focus-visible:border-primary"
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  required
                />

                {/* Fixed-height validation message container to prevent layout shifting */}
                <div className="h-5 flex items-center mt-0.5">
                  {validationMessage ? (
                    <p className={`text-[11px] font-semibold leading-none ${
                      availability === "available" ? "text-emerald-500" :
                      availability === "taken" ? "text-rose-500" :
                      "text-amber-500"
                    }`}>
                      {validationMessage}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-none">
                      Letters, numbers, underscores, and hyphens. 2-40 chars.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Avatar Selector */}
              <div className="flex flex-col gap-3">
                <label className="text-xs sm:text-sm font-semibold text-foreground">Select an Avatar</label>
                
                <div className="grid grid-cols-5 gap-3 sm:gap-4 w-full">
                  {avatars.map((avatar, i) => {
                    const IconComponent = avatar.icon
                    const isSelected = selectedAvatar === i
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedAvatar(i)}
                        disabled={loading}
                        className={`size-12 sm:size-14 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                            : "border-border hover:border-muted-foreground bg-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <IconComponent className="size-5 sm:size-6" strokeWidth={1.75} />
                      </button>
                    )
                  })}
                </div>
              </div>
 
              <Button 
                type="submit" 
                disabled={loading || checking || availability !== "available"} 
                className="w-full mt-4 h-11 sm:h-12 cursor-pointer font-bold text-sm sm:text-base rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Completing Setup...
                  </span>
                ) : checking ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Validating...
                  </span>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>
 
            {/* Skip for now */}
            <div className="mt-6 text-center flex flex-col gap-1.5 items-center">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading || checking}
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50 font-bold focus:outline-none"
              >
                Skip for now &rarr;
              </button>
              <p className="text-[10px] sm:text-xs text-muted-foreground">You can update your username and avatar in Settings later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
