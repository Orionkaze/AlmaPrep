import { describe, it, expect, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { bridgeGoogleUserToSupabase } from "./supabaseAuthBridge"

const EMAIL = "student@example.com"
const DERIVED = "derived-password"

type SignInResult = { data: { user: { id: string } | null }; error: { message: string } | null }

function makeSupabase(signInResults: SignInResult[]) {
  const signInWithPassword = vi.fn(async () => {
    return signInResults.shift() ?? { data: { user: null }, error: { message: "no result queued" } }
  })
  const signUp = vi.fn(async () => ({ data: {}, error: null }))
  const verifyOtp = vi.fn(async () => ({ data: { user: { id: "existing-uuid" } }, error: null }))
  return {
    client: { auth: { signInWithPassword, signUp, verifyOtp } } as unknown as SupabaseClient,
    signInWithPassword,
    signUp,
    verifyOtp,
  }
}

function makeAdmin(opts: {
  createError?: { code?: string; message: string } | null
  generateLinkToken?: string | null
}) {
  const createUser = vi.fn(async () => ({ data: {}, error: opts.createError ?? null }))
  const updateUserById = vi.fn(async () => ({ data: {}, error: null }))
  const generateLink = vi.fn(async () => ({
    data: { properties: { hashed_token: opts.generateLinkToken ?? "tok_123" } },
    error: null,
  }))
  return {
    client: { auth: { admin: { createUser, updateUserById, generateLink } } } as unknown as SupabaseClient,
    createUser,
    updateUserById,
    generateLink,
  }
}

describe("bridgeGoogleUserToSupabase", () => {
  it("signs in directly when the derived password already works", async () => {
    const supabase = makeSupabase([{ data: { user: { id: "uuid-1" } }, error: null }])
    const admin = makeAdmin({})

    const result = await bridgeGoogleUserToSupabase(supabase.client, admin.client, EMAIL, DERIVED)

    expect(result).toEqual({ ok: true, userId: "uuid-1" })
    expect(admin.createUser).not.toHaveBeenCalled()
    expect(admin.generateLink).not.toHaveBeenCalled()
  })

  it("provisions a brand new user and then signs them in", async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: { message: "Invalid login credentials" } },
      { data: { user: { id: "uuid-new" } }, error: null },
    ])
    const admin = makeAdmin({ createError: null })

    const result = await bridgeGoogleUserToSupabase(supabase.client, admin.client, EMAIL, DERIVED)

    expect(result).toEqual({ ok: true, userId: "uuid-new" })
    expect(admin.createUser).toHaveBeenCalledOnce()
    expect(admin.generateLink).not.toHaveBeenCalled()
  })

  // The regression this whole module exists for.
  it("never overwrites the password of an account that already exists", async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: { message: "Invalid login credentials" } },
    ])
    const admin = makeAdmin({
      createError: { code: "email_exists", message: "A user with this email address has already been registered" },
    })

    const result = await bridgeGoogleUserToSupabase(supabase.client, admin.client, EMAIL, DERIVED)

    expect(result).toEqual({ ok: true, userId: "existing-uuid" })
    expect(admin.updateUserById).not.toHaveBeenCalled()
    expect(admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: EMAIL })
    expect(supabase.verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "tok_123" })
  })

  it("recognises the already-registered case from the message alone", async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: { message: "Invalid login credentials" } },
    ])
    const admin = makeAdmin({
      createError: { message: "User already registered" },
    })

    const result = await bridgeGoogleUserToSupabase(supabase.client, admin.client, EMAIL, DERIVED)

    expect(result.ok).toBe(true)
    expect(admin.updateUserById).not.toHaveBeenCalled()
  })

  it("reports failure rather than silently continuing when provisioning breaks", async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: { message: "Invalid login credentials" } },
    ])
    const admin = makeAdmin({ createError: { message: "Database is down" } })

    const result = await bridgeGoogleUserToSupabase(supabase.client, admin.client, EMAIL, DERIVED)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("Database is down")
  })

  it("falls back to signUp when there is no service-role client", async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: { message: "Invalid login credentials" } },
      { data: { user: { id: "uuid-dev" } }, error: null },
    ])

    const result = await bridgeGoogleUserToSupabase(supabase.client, null, EMAIL, DERIVED)

    expect(result).toEqual({ ok: true, userId: "uuid-dev" })
    expect(supabase.signUp).toHaveBeenCalledOnce()
  })
})
