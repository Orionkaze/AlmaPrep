"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"

/**
 * Route-segment error boundary.
 *
 * The app had only global-error.tsx, which React reaches solely when the root
 * layout itself fails. Anything thrown inside a page — a Supabase query, or
 * createClient() refusing to start without its env vars — fell through to
 * Next's unstyled default screen with no way back. This catches those, reports
 * them, and offers a retry.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="almaprep-theme">
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "44ch", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            This page failed to load. Your practice history is safe — trying again usually
            sorts it out.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <Link className="btn btn-ghost" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
          {error.digest && (
            <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: "20px" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
