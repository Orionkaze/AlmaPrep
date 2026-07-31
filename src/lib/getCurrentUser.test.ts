import { describe, it, expect, vi, beforeEach } from "vitest"

// getCurrentUser is now the only place that decides who a request belongs to
// (getRequestUserId delegates to it), so the demo-cookie rule that used to be
// covered via getRequestUserId's tests is pinned here.
const cookieHas = vi.fn()
const cookieGet = vi.fn()
const getUser = vi.fn()
const getServerSession = vi.fn()
const isMockAuthEnabled = vi.fn()
const verifyJWT = vi.fn()

vi.mock("next/headers", () => ({
  cookies: async () => ({ has: cookieHas, get: cookieGet }),
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
  getAuthSecret: () => "test-secret",
}))
vi.mock("@/lib/jwt", () => ({
  verifyJWT: (...args: unknown[]) => verifyJWT(...args),
}))

import { getCurrentUser } from "./getCurrentUser"

beforeEach(() => {
  cookieHas.mockReset()
  cookieGet.mockReset()
  getUser.mockReset()
  getServerSession.mockReset()
  isMockAuthEnabled.mockReset()
  verifyJWT.mockReset()

  cookieHas.mockReturnValue(false)
  cookieGet.mockReturnValue(undefined)
  getUser.mockResolvedValue({ data: { user: null } })
  getServerSession.mockResolvedValue(null)
  verifyJWT.mockResolvedValue(null)
})

describe("getCurrentUser with mock auth disabled", () => {
  beforeEach(() => isMockAuthEnabled.mockReturnValue(false))

  // The critical one. `mockmate-demo-session` is unsigned and only ever written
  // by client code, so outside mock auth it must confer nothing — otherwise any
  // visitor sets it in devtools and satisfies every `if (!userId)` check.
  it("ignores the demo cookie entirely", async () => {
    cookieHas.mockReturnValue(true)
    const result = await getCurrentUser()
    expect(result.userId).toBeNull()
    expect(result.isDemo).toBe(false)
    expect(cookieHas).not.toHaveBeenCalled()
  })

  it("resolves a Supabase session", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "sb-1", email: "a@b.co", user_metadata: {} } },
    })
    const result = await getCurrentUser()
    expect(result.userId).toBe("sb-1")
    expect(result.isDemo).toBe(false)
  })

  it("falls back to a NextAuth session", async () => {
    getServerSession.mockResolvedValue({ user: { id: "na-1", email: "a@b.co" } })
    const result = await getCurrentUser()
    expect(result.userId).toBe("na-1")
  })

  it("reports nobody when neither is present", async () => {
    const result = await getCurrentUser()
    expect(result).toMatchObject({ userId: null, email: null, isDemo: false })
  })

  it("fails closed when the Supabase lookup throws", async () => {
    getUser.mockRejectedValue(new Error("network down"))
    const result = await getCurrentUser()
    expect(result.userId).toBeNull()
  })
})

describe("getCurrentUser with mock auth enabled", () => {
  beforeEach(() => isMockAuthEnabled.mockReturnValue(true))

  it("accepts a verified mock session token", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === "mockmate-mock-session" ? { value: "token" } : undefined
    )
    verifyJWT.mockResolvedValue({ userId: "demo-user-id", email: "demo@x.co" })
    const result = await getCurrentUser()
    expect(result).toMatchObject({ userId: "demo-user-id", isDemo: true })
  })

  it("accepts the plain demo cookie as a local affordance", async () => {
    cookieHas.mockReturnValue(true)
    const result = await getCurrentUser()
    expect(result).toMatchObject({ userId: "demo-user-id", isDemo: true })
  })

  it("does not accept a mock token that fails verification", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === "mockmate-mock-session" ? { value: "forged" } : undefined
    )
    verifyJWT.mockResolvedValue(null)
    const result = await getCurrentUser()
    expect(result.userId).toBeNull()
  })
})

// Next throws these as control flow; swallowing them made routes report
// "no user" during static rendering and buried real errors in the build log.
describe("getCurrentUser and Next's control-flow errors", () => {
  beforeEach(() => isMockAuthEnabled.mockReturnValue(false))

  it("re-throws a dynamic-rendering signal instead of reporting no user", async () => {
    getUser.mockRejectedValue(Object.assign(new Error("dynamic"), { digest: "DYNAMIC_SERVER_USAGE" }))
    await expect(getCurrentUser()).rejects.toMatchObject({ digest: "DYNAMIC_SERVER_USAGE" })
  })

  it("re-throws a redirect signal", async () => {
    getServerSession.mockRejectedValue(
      Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;push;/login;307;" })
    )
    await expect(getCurrentUser()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })
  })
})
