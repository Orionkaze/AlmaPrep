// Thin analytics wrapper around PostHog.
//
// Everything here is a no-op unless NEXT_PUBLIC_POSTHOG_KEY is set, so the app
// runs identically in local dev / before analytics is provisioned. Import and
// call track()/identify() freely — the guard lives in one place.
//
// Set NEXT_PUBLIC_POSTHOG_KEY (and optionally NEXT_PUBLIC_POSTHOG_HOST) in the
// deploy env to turn it on. Init happens in components/PostHogProvider.tsx.
import posthog from "posthog-js"

const ENABLED =
  typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY

/** Canonical event names — keep the funnel legible in the PostHog dashboard. */
export const EVENTS = {
  SIGNUP: "signup",
  LOGIN: "login",
  ONBOARDING_COMPLETED: "onboarding_completed",
  INTERVIEW_STARTED: "interview_started",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW_TRACK_SELECTED: "interview_track_selected",
  CODING_CHALLENGE_STARTED: "coding_challenge_started",
  CODING_SOLUTION_SUBMITTED: "coding_solution_submitted",
  GITHUB_SAVE_COMPLETED: "github_save_completed",
  CHECKOUT_VIEWED: "checkout_viewed",
  UPGRADE_CLICKED: "upgrade_clicked",
  RESULT_SHARED: "result_shared",
} as const

export function track(event: string, props?: Record<string, unknown>) {
  if (!ENABLED) return
  try {
    posthog.capture(event, props)
  } catch {
    // analytics must never break the app
  }
}

export function identify(id: string, props?: Record<string, unknown>) {
  if (!ENABLED) return
  try {
    posthog.identify(id, props)
  } catch {
    // no-op
  }
}
