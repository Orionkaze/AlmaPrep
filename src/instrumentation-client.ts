// Sentry (browser). Env-gated on NEXT_PUBLIC_SENTRY_DSN — no DSN, no init.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
    enabled: process.env.NODE_ENV === "production",
  })
}

// Required by Sentry to capture client-side navigation spans in the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// PostHog (browser). Env-gated on NEXT_PUBLIC_POSTHOG_KEY — missing key logs a
// dev warning but never breaks the app; production stays a no-op.
import posthog from "posthog-js"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (!posthogKey) {
  if (process.env.NODE_ENV !== "production") {
    console.error(
      "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, " +
      "this causes events to be silently missed. " +
      "This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured"
    )
  }
} else {
  posthog.init(posthogKey, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    debug: process.env.NODE_ENV === "development",
  })
}
