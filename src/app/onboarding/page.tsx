"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Laptop, UserRound, Rocket, Brain, Star, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserProfile } from "@/app/actions/profile"
import Link from "next/link"

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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError(null)

    const result = await createUserProfile(username.trim(), avatars[selectedAvatar].name)

    if (result.success) {
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
      window.location.href = "/dashboard"
    } else {
      setError(result.error || "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-lg">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground" style={headingStyle}>Almost there!</h1>
          <p className="text-muted-foreground text-sm">Let&apos;s set up your profile.</p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">Choose a Username</label>
                <Input
                  id="username"
                  type="text"
                  placeholder="interview_pro"
                  className="h-12 border-border focus:border-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">This will be displayed on your dashboard.</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-foreground">Select an Avatar</label>
                <ToggleGroup
                  type="single"
                  value={selectedAvatar.toString()}
                  onValueChange={(val) => {
                    if (val !== undefined && val !== "") {
                      setSelectedAvatar(parseInt(val))
                    }
                  }}
                  className="flex gap-4 flex-wrap justify-center sm:justify-start"
                >
                  {avatars.map((avatar, i) => {
                    const IconComponent = avatar.icon
                    return (
                      <ToggleGroupItem
                        key={i}
                        value={i.toString()}
                        variant="outline"
                        className="size-16 rounded-full border border-border flex items-center justify-center cursor-pointer data-[state=on]:border-primary data-[state=on]:ring-2 data-[state=on]:ring-primary/30 data-[state=on]:text-primary"
                      >
                        <IconComponent size={24} strokeWidth={1.75} />
                      </ToggleGroupItem>
                    )
                  })}
                </ToggleGroup>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-4 h-12 cursor-pointer font-semibold">
                {loading ? "Completing Setup..." : "Complete Setup"}
              </Button>
            </form>

            {/* Skip for now */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50 font-semibold"
              >
                Skip for now →
              </button>
              <p className="text-xs text-muted-foreground mt-1.5">You can update your profile anytime from Settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
