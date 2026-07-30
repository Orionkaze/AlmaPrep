/**
 * Environment gates that decide how the app authenticates. Every one of these
 * used to be duplicated as an inline `process.env.X || "literal"` across six
 * files; they live here now so there is exactly one answer per question.
 *
 * Two rules drive everything below:
 *
 * 1. Production must never fall back to a committed secret. A missing
 *    NEXTAUTH_SECRET is a deploy error, not something to paper over — the
 *    Google sign-in path derives Supabase passwords from it (see lib/auth.ts),
 *    so a known secret means anyone can compute anyone's password.
 *
 * 2. Mock auth is an explicit opt-in, never inferred. It used to be selected by
 *    string-matching the Supabase URL (and by the URL being *absent*), which
 *    meant a missing or mistyped NEXT_PUBLIC_SUPABASE_URL in production turned
 *    the app into one that accepts any password. It now requires
 *    NEXT_PUBLIC_MOCK_AUTH=true and is force-disabled in production.
 */

/** Dev-only stand-in. Deliberately not a plausible secret — it must never work anywhere real. */
const DEV_ONLY_SECRET = "almaprep-development-only-secret-not-for-any-deployment"

const MISSING_SECRET_MESSAGE =
  "NEXTAUTH_SECRET is not set. It signs session JWTs and derives the Supabase " +
  "password for every Google-provisioned account, so the app refuses to start " +
  "without it in production. Set it in the deploy environment."

/**
 * The signing secret for NextAuth sessions and the mock-session JWT.
 *
 * Throws in production when unset. In development it returns a fixed dev value
 * so `npm run dev` works with no .env — that value is public and useless.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === "production") {
    throw new Error(MISSING_SECRET_MESSAGE)
  }
  return DEV_ONLY_SECRET
}

/**
 * True when the app should use the in-memory/cookie-backed fake Supabase
 * clients instead of talking to a real project.
 *
 * The mock client accepts ANY email/password pair and mints a session, so this
 * must be impossible to reach in production regardless of how the env is
 * configured. Hence the hard NODE_ENV check before the flag is even read.
 */
export function isMockAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false
  return process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
}
