// Sentry (server runtime). Only initializes when a DSN is set, so absent config
// = no-op. Set SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN) in the deploy env to turn
// error monitoring on for server components, route handlers, and server actions.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Don't spam the console in dev when DSN is unset (guarded above anyway).
    enabled: process.env.NODE_ENV === "production",
  })
}
