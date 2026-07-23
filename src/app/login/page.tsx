"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signIn } from "next-auth/react"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"

import { useEffect } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      if (code) {
        window.location.href = `/auth/callback?code=${code}&next=/dashboard`
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Clear demo cookie if logging in with real credentials (not mock mode)
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz") ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-supabase-project-id")
        if (!isMockMode) {
          document.cookie = "mockmate-demo-session=; path=/; max-age=0"
        }
        window.location.href = "/dashboard"
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
            <h1 style={{ marginTop: "16px", marginBottom: "8px", fontSize: "1.8rem" }}>Welcome Back</h1>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Sign in to continue your interview prep.</p>
          </div>

          {error && (
            <div className="auth-note" style={{ background: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {loading ? "Signing In..." : "Sign In"}
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

            <button
              type="button"
              onClick={async () => {
                setError(null)
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "github",
                  options: {
                    scopes: "repo read:user",
                    redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
                  }
                })
                if (error) {
                  setError(error.message)
                }
              }}
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "center", gap: "10px", marginTop: "8px" }}
            >
              <svg style={{ width: "20px", height: "20px" }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
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
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ fontWeight: 600, color: "var(--emerald-600)" }}>
              Sign up
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
