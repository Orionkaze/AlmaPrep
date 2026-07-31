"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"
import { CONSENT_STORAGE_KEY, readConsent } from "@/lib/consent"

// Initializes PostHog client-side when NEXT_PUBLIC_POSTHOG_KEY is present AND
// the visitor has granted analytics consent, then records a pageview on every
// App Router navigation. Without the key, or without consent, this renders
// children and does nothing else.
//
// We track pageviews manually off usePathname (not PostHog's automatic capture)
// because the App Router does client-side transitions the SDK's default
// pageview logic misses. We deliberately avoid useSearchParams here so this
// provider doesn't force the whole tree into a Suspense/CSR bailout.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consented, setConsented] = useState(false)

  // Consent can be granted after mount (via the banner), so listen for the
  // change rather than reading it once.
  useEffect(() => {
    const sync = () => setConsented(readConsent() === true)
    sync()
    window.addEventListener(CONSENT_STORAGE_KEY, sync)
    return () => window.removeEventListener(CONSENT_STORAGE_KEY, sync)
  }, [])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || !consented) return
    if (posthog.__loaded) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
      // Off by default in this app. Autocapture records the text of clicked
      // elements, and these pages render interview answers and AI feedback —
      // exactly the content that should not leave the page. The named events in
      // lib/analytics.ts carry everything the funnel actually needs.
      autocapture: false,
      disable_session_recording: true,
    })
  }, [consented])

  const pathname = usePathname()
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    if (!consented || !posthog.__loaded) return
    posthog.capture("$pageview", { $current_url: window.location.href })
  }, [pathname, consented])

  return <>{children}</>
}
