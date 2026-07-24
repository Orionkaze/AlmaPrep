"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="mark" viewBox="0 0 80 80" aria-hidden="true" style={{ width: size, height: size }}>
      <rect width="80" height="80" rx="18" fill="#059669" />
      <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
      <rect x="30" y="40" width="20" height="8" fill="#059669" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Until we've confirmed a recovery session is present, we don't let the user
  // submit — a stale/expired link should fail loudly, not silently no-op.
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // /auth/callback already exchanged the recovery code and set the session
    // cookie before redirecting here. Confirm it landed.
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setReady(true)
      } else {
        setError("This reset link is invalid or has expired. Request a new one below.")
      }
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  return (
    <div className="almaprep-theme">
      <main className="auth-main" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="auth-card" style={{ width: "100%", maxWidth: 400 }}>
          <Link href="/" className="brand" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <BrandMark />
            <span style={{ fontSize: "1.2rem", fontWeight: 600 }}>Almaprep</span>
          </Link>

          {done ? (
            <>
              <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>Password updated</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 24 }}>
                You&apos;re all set. Sign in with your new password.
              </p>
              <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Go to sign in
              </Link>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Set a new password</h1>
                <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Choose a strong password you don&apos;t use elsewhere.</p>
              </div>

              {error && <div className="field-error">{error}</div>}

              {ready && (
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label htmlFor="password">New password</label>
                    <div className="pw-field">
                      <input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                      <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                        <i className={showPw ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="confirm">Confirm password</label>
                    <input id="confirm" type={showPw ? "text" : "password"} placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                    {loading ? "Updating…" : "Update password"}
                  </button>
                </form>
              )}

              {!ready && (
                <p className="auth-alt" style={{ marginTop: 24 }}>
                  <Link href="/forgot-password" style={{ fontWeight: 600, color: "var(--emerald-600)" }}>Request a new reset link</Link>
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
