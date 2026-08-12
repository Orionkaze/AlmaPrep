import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Bridging a NextAuth (Google) login into a real Supabase session.
 *
 * Google users have no Supabase password of their own, so the app derives one
 * deterministically from their email + NEXTAUTH_SECRET and signs in with it.
 * That works for accounts this app provisioned. It does NOT work for an account
 * the student created themselves with email + password, because that account
 * has a password we cannot guess.
 *
 * The previous handling of that case was to overwrite the stored password with
 * the derived one via the service-role admin API. That silently destroyed the
 * student's real password — email sign-in stopped working for anyone who ever
 * clicked "Sign in with Google" — and it meant a NEXTAUTH_SECRET leak would
 * hand over every account that had ever touched Google, not just the ones we
 * auto-provisioned.
 *
 * Instead, for an existing account we mint a session the way Supabase intends:
 * generate a single-use magic-link token with the service role and redeem it
 * immediately. The stored password is never read and never written.
 */

/** GoTrue's ways of saying "that email is already registered". */
function isEmailAlreadyRegistered(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "email_exists" || error.code === "user_already_exists") return true
  const message = (error.message || "").toLowerCase()
  return message.includes("already been registered") || message.includes("already registered")
}

export type BridgeResult =
  | { ok: true; userId: string | null }
  | { ok: false; reason: string }

/**
 * Redeem a service-role magic link so `supabase` ends up holding a real session
 * for `email`. Requires the user to already exist in Supabase Auth.
 */
export async function establishSessionViaMagicLink(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  email: string
): Promise<BridgeResult> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (error) return { ok: false, reason: `generateLink failed: ${error.message}` }

  const tokenHash = data?.properties?.hashed_token
  if (!tokenHash) return { ok: false, reason: "generateLink returned no token" }

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  })

  if (verifyError) return { ok: false, reason: `verifyOtp failed: ${verifyError.message}` }

  return { ok: true, userId: verified?.user?.id ?? null }
}

/**
 * Get `supabase` into a signed-in state for a Google user, provisioning the
 * Supabase account first if this is their first visit.
 *
 * Order matters and is deliberately cheap-first:
 *   1. Sign in with the derived password — one call, covers every account we
 *      provisioned, and needs no service-role key.
 *   2. Try to create the account. Success means they were genuinely new.
 *   3. "Already registered" means they signed up with their own password.
 *      Mint a session by magic link and leave that password alone.
 *
 * Returns ok:false rather than throwing; callers decide whether that is fatal.
 */
export async function bridgeGoogleUserToSupabase(
  supabase: SupabaseClient,
  admin: SupabaseClient | null,
  email: string,
  derivedPassword: string
): Promise<BridgeResult> {
  const signIn = await supabase.auth.signInWithPassword({ email, password: derivedPassword })
  if (!signIn.error) return { ok: true, userId: signIn.data.user?.id ?? null }

  if (!admin) {
    // Local dev with no service-role key. signUp is the only tool available,
    // and it cannot clobber an existing account, so it is safe here.
    const { error: signUpError } = await supabase.auth.signUp({ email, password: derivedPassword })
    if (signUpError) return { ok: false, reason: `signUp failed: ${signUpError.message}` }

    const retry = await supabase.auth.signInWithPassword({ email, password: derivedPassword })
    if (retry.error) return { ok: false, reason: `signIn after signUp failed: ${retry.error.message}` }
    return { ok: true, userId: retry.data.user?.id ?? null }
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: derivedPassword,
    email_confirm: true,
  })

  if (!createError) {
    const retry = await supabase.auth.signInWithPassword({ email, password: derivedPassword })
    if (retry.error) return { ok: false, reason: `signIn after provisioning failed: ${retry.error.message}` }
    return { ok: true, userId: retry.data.user?.id ?? null }
  }

  if (!isEmailAlreadyRegistered(createError)) {
    return { ok: false, reason: `createUser failed: ${createError.message}` }
  }

  // They own this account already. Their password stays untouched.
  return establishSessionViaMagicLink(supabase, admin, email)
}
