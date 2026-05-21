"use client"

import { GlowButton } from "@/components/ui/glow-button"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setLoading(false)
        // Clear demo cookie if signing up with real credentials
        document.cookie = "mockmate-demo-session=; path=/; max-age=0"
        
        if (data.session) {
          setSuccess("Account created successfully! Redirecting to onboarding...")
          // Wait a second and redirect to onboarding
          setTimeout(() => {
            router.push("/onboarding")
            router.refresh()
          }, 1500)
        } else {
          setSuccess("Verification email sent! Please check your inbox and click the verification link to complete setup and continue to onboarding.")
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred."
      setError(errorMsg)
      setLoading(false)
    }
  }

  const handleGuestLogin = () => {
    document.cookie = "mockmate-demo-session=true; path=/; max-age=86400"
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Mock Mate
          </Link>
          <h1 className="text-3xl font-bold mt-6 mb-2">Create an Account</h1>
          <p className="text-foreground/70">Start your journey to interview mastery.</p>
        </div>

        <GlassCard className="p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-400 text-xs font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground/90">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="input-glass h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground/90">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="input-glass h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <GlowButton type="submit" disabled={loading || !!success} className="w-full mt-4 h-12 cursor-pointer">
              {loading ? "Creating Account..." : "Sign Up"}
            </GlowButton>

            <div className="relative my-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#0d0a16] px-3 text-xs text-foreground/40 uppercase">Or</span>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full h-12 rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors font-semibold text-sm cursor-pointer"
            >
              Explore as Guest (Demo)
            </button>
          </form>

          <p className="text-center text-sm text-foreground/70 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </div>
    </main>
  )
}
