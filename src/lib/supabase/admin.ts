import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { isMockAuthEnabled } from "@/lib/env"

/**
 * SERVER-ONLY Supabase client using the service-role key. It BYPASSES row-level
 * security, so it must never be imported from a "use client" file and must only
 * be used for trusted server paths: tier grants, quota accounting, lead writes.
 *
 * Returns `null` when the service-role key or URL is missing, or in mock mode.
 * Callers MUST handle null explicitly (e.g. log + no-op in local dev) rather
 * than assuming a client exists — this is deliberately different from the
 * browser/server clients, which return a silent fake.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` must be present in the deploy environment for any
 * of the write paths above to actually persist. Without it they degrade to
 * console logging.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser")
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  // No service-role client while mock auth is on: there is no real project to
  // talk to, and callers already treat null as "degrade to console logging".
  if (!url || !key || isMockAuthEnabled()) {
    return null
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
