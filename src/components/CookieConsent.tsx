"use client"

import { useEffect, useState } from "react"
import { CONSENT_STORAGE_KEY, readConsent, writeConsent } from "@/lib/consent"

/**
 * Analytics consent gate.
 *
 * PostHog used to initialise on page load for everyone. Almaprep is sold to
 * schools, is used by minors, and its own institutions page cites GDPR
 * principles — none of which is compatible with dropping analytics cookies
 * before anyone has agreed. Nothing is captured until a choice is stored here.
 *
 * Rendering is deferred to an effect so the server and first client render
 * agree; a banner that appears a beat later is better than a hydration
 * mismatch on every page.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    // Deliberate mount-only read: localStorage does not exist during the server
    // render, so seeding this into useState would guarantee a hydration
    // mismatch on every page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readConsent() === null) setVisible(true)
  }, [])

  const choose = (granted: boolean) => {
    writeConsent(granted)
    setVisible(false)
    // PostHogProvider listens for this and starts (or stays off) accordingly.
    window.dispatchEvent(new CustomEvent(CONSENT_STORAGE_KEY))
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 60,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "14px 20px",
        background: "var(--card, #fff)",
        borderTop: "1px solid var(--border, #e5e7eb)",
        boxShadow: "0 -4px 20px rgba(0,0,0,.06)",
      }}
    >
      <p style={{ margin: 0, fontSize: ".9rem", maxWidth: "60ch" }}>
        We&apos;d like to use analytics cookies to understand how Almaprep is used. They
        are optional, and practice sessions work either way.{" "}
        <a href="/privacy" style={{ textDecoration: "underline" }}>
          Privacy policy
        </a>
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" className="btn btn-ghost" onClick={() => choose(false)}>
          Decline
        </button>
        <button type="button" className="btn btn-primary" onClick={() => choose(true)}>
          Accept
        </button>
      </div>
    </div>
  )
}
