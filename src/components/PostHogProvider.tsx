"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"

// Initializes PostHog once (client-side) when NEXT_PUBLIC_POSTHOG_KEY is present,
// and records a pageview on every App Router navigation. When the key is absent
// this renders children and does nothing else — a clean no-op for local dev.
//
// We track pageviews manually off usePathname (not PostHog's automatic capture)
// because the App Router does client-side transitions the SDK's default
// pageview logic misses. We deliberately avoid useSearchParams here so this
// provider doesn't force the whole tree into a Suspense/CSR bailout.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    if (posthog.__loaded) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
    })
  }, [])

  const pathname = usePathname()
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    if (!posthog.__loaded) return
    posthog.capture("$pageview", { $current_url: window.location.href })
  }, [pathname])

  return <>{children}</>
}
