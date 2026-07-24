import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the three dependencies getRequestUserId resolves through, so we can
// assert the precedence order: demo cookie → NextAuth → Supabase → null.
const cookieHas = vi.fn()
const getServerSession = vi.fn()
const getUser = vi.fn()

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

import { getRequestUserId } from "./getRequestUserId"

describe("getRequestUserId precedence", () => {
  beforeEach(() => {
    cookieHas.mockReset()
    getServerSession.mockReset()
    getUser.mockReset()
  })

  it("returns demo id when the demo cookie is present (before touching auth)", async () => {
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
