"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { signIn } from "next-auth/react"
import { track, EVENTS } from "@/lib/analytics"

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="mark" viewBox="0 0 80 80" aria-hidden="true" style={{ width: size, height: size }}>
      <rect width="80" height="80" rx="18" fill="#059669" />
      <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
      <rect x="30" y="40" width="20" height="8" fill="#059669" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        track(EVENTS.LOGIN, { method: "email" })
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz")
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

  const handleGithub = async () => {
    setError(null)
    track(EVENTS.LOGIN, { method: "github" })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { scopes: "repo read:user", redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="almaprep-theme">
      <main className="auth-split">
        <aside className="auth-aside">
          <Link href="/" className="brand" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <BrandMark />
            <span style={{ fontSize: "1.3rem", fontWeight: 600 }}>Almaprep</span>
          </Link>

          <div>
            <h2>Walk into the real interview already rehearsed.</h2>
            <p className="aside-sub">Pick up right where you left off — your streak, your scores, and your next mock are waiting.</p>
            <ul className="auth-points">
              <li>
                <span className="pt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></span>
                <span>Live voice AI interviews you actually speak in</span>
              </li>
              <li>
                <span className="pt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
                <span>Thousands of vetted, most-probable questions</span>
              </li>
              <li>
                <span className="pt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                <span>Instant scoring and detailed feedback</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="auth-highlight">
              <div className="hl-top">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Included free
              </div>
              <p>Live voice AI interviews on every plan — you practice speaking, not just typing.</p>
            </div>
            <ul className="auth-trust">
              <li>Free forever</li>
              <li>No credit card</li>
              <li>2-minute setup</li>
            </ul>
          </div>
        </aside>

        <div className="auth-main">
          <div className="auth-card">
            <Link href="/" className="auth-card-brand">
              <BrandMark size={26} /> Almaprep
            </Link>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Welcome back</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Sign in to continue your interview prep.</p>
            </div>

            {error && <div className="field-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>

              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label htmlFor="password">Password</label>
                  <Link href="/forgot-password" style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--emerald-600)" }}>Forgot password?</Link>
                </div>
                <div className="pw-field">
                  <input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                    <i className={showPw ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <div className="oauth-grid">
              <button type="button" onClick={() => { track(EVENTS.LOGIN, { method: "google" }); signIn("google", { callbackUrl: "/dashboard" }) }} className="oauth-btn">
                <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button type="button" onClick={handleGithub} className="oauth-btn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </button>
            </div>

            <p className="auth-alt" style={{ marginTop: 24 }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ fontWeight: 600, color: "var(--emerald-600)" }}>Sign up free</Link>
            </p>

            <div className="auth-secure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Encrypted &amp; secure — we never post on your behalf
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
