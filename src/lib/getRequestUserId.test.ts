import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the dependencies getRequestUserId resolves through, so we can assert the
// precedence order: demo cookie (mock auth only) → NextAuth → Supabase → null.
const cookieHas = vi.fn()
const getServerSession = vi.fn()
const getUser = vi.fn()
const isMockAuthEnabled = vi.fn()

vi.mock("next/headers", () => ({
  cookies: async () => ({ has: cookieHas }),
}))
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}))
vi.mock("@/lib/env", () => ({
  isMockAuthEnabled: () => isMockAuthEnabled(),
}))

import { getRequestUserId } from "./getRequestUserId"

describe("getRequestUserId precedence", () => {
  beforeEach(() => {
    cookieHas.mockReset()
    getServerSession.mockReset()
    getUser.mockReset()
    isMockAuthEnabled.mockReset()
    isMockAuthEnabled.mockReturnValue(true)
  })

  it("returns demo id when the demo cookie is present under mock auth (before touching auth)", async () => {
    cookieHas.mockReturnValue(true)
    expect(await getRequestUserId()).toBe("demo-user-id")
    expect(getServerSession).not.toHaveBeenCalled()
    expect(getUser).not.toHaveBeenCalled()
  })

  it("falls through to NextAuth session id when no demo cookie", async () => {
    cookieHas.mockReturnValue(false)
    getServerSession.mockResolvedValue({ user: { id: "nextauth-123" } })
    expect(await getRequestUserId()).toBe("nextauth-123")
    expect(getUser).not.toHaveBeenCalled()
  })

  it("falls through to Supabase user id when no demo cookie and no NextAuth session", async () => {
    cookieHas.mockReturnValue(false)
    getServerSession.mockResolvedValue(null)
    getUser.mockResolvedValue({ data: { user: { id: "supabase-abc" } } })
    expect(await getRequestUserId()).toBe("supabase-abc")
  })

  it("returns null when nothing identifies the request", async () => {
    cookieHas.mockReturnValue(false)
    getServerSession.mockResolvedValue(null)
    getUser.mockResolvedValue({ data: { user: null } })
    expect(await getRequestUserId()).toBeNull()
  })
})

// The demo cookie is unsigned and only ever written by client code, so outside
// mock auth it must confer nothing at all — otherwise any visitor can set it in
// devtools and satisfy every `if (!userId) return 401` check in the app.
describe("getRequestUserId ignores the demo cookie when mock auth is off", () => {
  beforeEach(() => {
    cookieHas.mockReset()
    getServerSession.mockReset()
    getUser.mockReset()
    isMockAuthEnabled.mockReset()
    isMockAuthEnabled.mockReturnValue(false)
  })

  it("returns null for a demo cookie with no real session", async () => {
    cookieHas.mockReturnValue(true)
    getServerSession.mockResolvedValue(null)
    getUser.mockResolvedValue({ data: { user: null } })
    expect(await getRequestUserId()).toBeNull()
  })

  it("does not let the demo cookie shadow a real session", async () => {
    cookieHas.mockReturnValue(true)
    getServerSession.mockResolvedValue({ user: { id: "nextauth-123" } })
    expect(await getRequestUserId()).toBe("nextauth-123")
  })

  it("never reads the cookie jar at all", async () => {
    cookieHas.mockReturnValue(true)
    getServerSession.mockResolvedValue(null)
    getUser.mockResolvedValue({ data: { user: null } })
    await getRequestUserId()
    expect(cookieHas).not.toHaveBeenCalled()
  })
})
