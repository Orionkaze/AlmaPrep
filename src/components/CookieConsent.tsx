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
    <>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .cookie-banner-animate {
          animation: slideInUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div
        role="dialog"
        aria-label="Analytics consent"
        className="cookie-banner-animate fixed z-50 bottom-4 right-4 left-4 md:left-auto md:bottom-6 md:right-6 w-[calc(100vw-32px)] md:w-[380px] p-5 rounded-[20px] border border-border bg-card text-card-foreground flex flex-col gap-4"
        style={{
          boxShadow: "0 12px 40px rgba(0,0,0,0.22), 0 0 0 1px var(--color-border, rgba(255,255,255,0.06))"
        }}
      >
        {/* Header: Logo and Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7" viewBox="0 0 80 80" aria-hidden="true">
              <rect width="80" height="80" rx="18" fill="var(--color-primary, #059669)" />
              <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
              <rect x="30" y="40" width="20" height="8" fill="var(--color-primary, #059669)" />
            </svg>
            <span className="font-semibold text-sm tracking-wide">AlmaPrep</span>
          </div>
          
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            aria-label="Dismiss cookie consent"
            onClick={() => choose(false)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed" style={{ margin: 0 }}>
          We&apos;d like to use analytics cookies to understand how AlmaPrep is used. They
          are optional, and practice sessions work either way.{" "}
          <a
            href="/privacy"
            className="underline hover:text-emerald-400 transition-colors font-medium"
            style={{ color: "var(--color-primary, #10b981)" }}
          >
            Privacy policy
          </a>
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            className="btn btn-ghost flex-1 justify-center py-3 text-sm font-semibold rounded-xl border border-border"
            onClick={() => choose(false)}
          >
            Decline
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 justify-center py-3 text-sm font-semibold rounded-xl"
            onClick={() => choose(true)}
          >
            Accept
          </button>
        </div>
      </div>
    </>
  )
}
