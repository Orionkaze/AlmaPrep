import { PostHog } from "posthog-node"

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.NEXT_PUBLIC_POSTHOG_KEY
) {
  console.error(
    "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, " +
      "this causes events to be silently missed. This error stops appearing once " +
      "NEXT_PUBLIC_POSTHOG_KEY is configured"
  )
}

// Singleton client — flushAt:1 / flushInterval:0 ensures events are sent
// before each short-lived serverless handler returns.
let _client: PostHog | null = null

export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}
