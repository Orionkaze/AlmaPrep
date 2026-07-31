/**
 * Profile helpers, kept out of the "use server" action file.
 *
 * A `"use server"` module may only export async functions — every export
 * becomes a callable server action — so these synchronous helpers live here.
 */

/** Postgres unique-violation. `username` carries a UNIQUE constraint. */
const PG_UNIQUE_VIOLATION = "23505"

/**
 * Turn a database error into something a student can act on.
 *
 * These used to be returned verbatim, so picking a taken name showed
 * 'duplicate key value violates unique constraint "users_username_key"' on the
 * onboarding screen — and, because the dashboard sends anyone without a profile
 * back to onboarding, left them looping on it.
 */
export function friendlyProfileError(error: { code?: string; message: string }): string {
  if (error.code === PG_UNIQUE_VIOLATION) {
    return "That username is already taken. Please pick another."
  }
  return "We couldn't save your profile. Please try again."
}

/** Light validation so the constraint isn't the first thing that says no. */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim()
  if (trimmed.length < 2) return "Please choose a username with at least 2 characters."
  if (trimmed.length > 40) return "Please choose a username under 40 characters."
  return null
}
