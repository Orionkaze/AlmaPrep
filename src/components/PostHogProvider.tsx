"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"
import { createClient } from "@/lib/supabase/client"

// Tracks pageviews on every App Router navigation and identifies authenticated
// users on load/refresh. PostHog init happens in instrumentation-client.ts —
// never combine that with a second init here.
//
// We track pageviews manually off usePathname (not PostHog's automatic capture)
// because the App Router does client-side transitions the SDK's default
// pageview logic misses. We deliberately avoid useSearchParams here so this
// provider doesn't force the whole tree into a Suspense/CSR bailout.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Identify the user on mount / refresh if a session already exists.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user
      if (user) {
        posthog.identify(user.id, { email: user.email })
      }
    })
    // Subscribe to auth state changes (login / logout in other tabs, OAuth redirect).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        posthog.identify(session.user.id, { email: session.user.email })
      } else {
        posthog.reset()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const pathname = usePathname()
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    if (!posthog.__loaded) return
    posthog.capture("$pageview", { $current_url: window.location.href })
  }, [pathname])

  return <>{children}</>
}
