// Next.js instrumentation hook. Loads the right Sentry config per runtime and
// forwards server-side request errors to Sentry. All of it is a no-op when no
// Sentry DSN is configured (the configs guard on the env var).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) return
  const Sentry = await import("@sentry/nextjs")
  Sentry.captureRequestError(...args)
}
