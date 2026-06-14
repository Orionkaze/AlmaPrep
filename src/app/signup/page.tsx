"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signIn } from "next-auth/react"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"

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
        // Clear demo cookie if signing up with real credentials (not mock mode)
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz")
        if (!isMockMode) {
          document.cookie = "mockmate-demo-session=; path=/; max-age=0"
        }
        
        if (data.session) {
          setSuccess("Account created successfully! Redirecting to onboarding...")
          // Wait a second and redirect to onboarding
          setTimeout(() => {
            window.location.href = "/onboarding"
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

  return (
    <div className="almaprep-theme min-h-screen flex flex-col">
      <Header />
      
      <main className="auth-wrap flex-1 flex items-center justify-center">
        <div className="auth-card">
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <Link href="/" className="brand" style={{ justifyContent: "center" }}>
              <svg className="mark" viewBox="0 0 80 80" aria-hidden="true" style={{ width: "32px", height: "32px" }}>
                <rect width="80" height="80" rx="18" fill="#059669" />
                <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
                <rect x="30" y="40" width="20" height="8" fill="#059669" />
              </svg>
              Almaprep
            </Link>
            <h1 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "1.8rem" }}>Create an Account</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Start your journey to interview mastery.</p>
          </div>

          {error && (
            <div className="auth-note" style={{ background: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" }}>
              {error}
            </div>
          )}

          {success && (
            <div className="auth-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading || !!success} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "8px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ padding: "0 12px", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", gap: "10px" }}
            >
              <svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "8px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ padding: "0 12px", fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <button
              type="button"
              onClick={() => {
                document.cookie = "mockmate-demo-session=true; path=/; max-age=604800" // 7 days
                window.location.href = "/dashboard"
              }}
              className="btn"
              style={{ width: "100%", justifyContent: "center", background: "#10b981", color: "#ffffff", border: "none" }}
            >
              🚀 Launch Local Demo Mode (No DB)
            </button>
          </form>

          <p className="auth-alt" style={{ marginTop: "24px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ fontWeight: 600, color: "var(--emerald-600)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
