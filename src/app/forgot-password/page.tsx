"use client"

import Link from "next/link"
import { useState } from "react"
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // The recovery link lands on /auth/callback, which exchanges the code for a
    // short-lived recovery session and then forwards to /reset-password where the
    // user sets a new password. Reusing the existing callback route keeps all the
    // session-exchange logic in one place.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    // Always show the same confirmation regardless of whether the email exists —
    // never reveal which addresses have accounts.
    if (error) {
      console.error("resetPasswordForEmail error:", error)
    }
    setSent(true)
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

          {sent ? (
            <>
              <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>Check your email</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 24 }}>
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password. It expires in an hour.
              </p>
              <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Reset your password</h1>
                <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Enter your email and we&apos;ll send you a link to set a new one.</p>
              </div>

              {error && <div className="field-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <p className="auth-alt" style={{ marginTop: 24 }}>
                Remembered it?{" "}
                <Link href="/login" style={{ fontWeight: 600, color: "var(--emerald-600)" }}>Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
