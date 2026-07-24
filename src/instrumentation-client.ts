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
