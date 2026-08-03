import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// NODE_ENV is read at call time by both helpers, so each test sets it explicitly.
const ORIGINAL_ENV = { ...process.env }

function setEnv(values: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) delete process.env[k]
    else vi.stubEnv(k, v)
  }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  delete process.env.NEXTAUTH_SECRET
  delete process.env.NEXT_PUBLIC_MOCK_AUTH
})

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = { ...ORIGINAL_ENV }
})

describe("getAuthSecret", () => {
  it("returns the configured secret", async () => {
    setEnv({ NODE_ENV: "production", NEXTAUTH_SECRET: "s3cret-from-the-deploy-env" })
    const { getAuthSecret } = await import("./env")
    expect(getAuthSecret()).toBe("s3cret-from-the-deploy-env")
  })

  // The Google sign-in path derives every user's Supabase password from this
  // value, so a fallback in production means anyone holding the repo can log in
  // as anyone. It must fail the deploy instead.
  it("throws in production when unset", async () => {
    setEnv({ NODE_ENV: "production", NEXTAUTH_SECRET: undefined })
    const { getAuthSecret } = await import("./env")
    expect(() => getAuthSecret()).toThrow(/NEXTAUTH_SECRET is not set/)
  })

  it("falls back to a fixed dev value outside production so local dev needs no .env", async () => {
    setEnv({ NODE_ENV: "development", NEXTAUTH_SECRET: undefined })
    const { getAuthSecret } = await import("./env")
    expect(getAuthSecret()).toContain("development-only")
  })
})

describe("isMockAuthEnabled", () => {
  it("is on when explicitly opted in outside production", async () => {
    setEnv({ NODE_ENV: "development", NEXT_PUBLIC_MOCK_AUTH: "true" })
    const { isMockAuthEnabled } = await import("./env")
    expect(isMockAuthEnabled()).toBe(true)
  })

  it("is off without the flag, even with no Supabase URL configured", async () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_MOCK_AUTH: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    })
    const { isMockAuthEnabled } = await import("./env")
    expect(isMockAuthEnabled()).toBe(false)
  })

  // The mock clients accept any email/password pair and mint a session. No
  // environment misconfiguration may reach them on a real deploy.
  it("is off in production even when the flag is set", async () => {
    setEnv({ NODE_ENV: "production", NEXT_PUBLIC_MOCK_AUTH: "true" })
    const { isMockAuthEnabled } = await import("./env")
    expect(isMockAuthEnabled()).toBe(false)
  })

  it("treats any value other than \"true\" as off", async () => {
    setEnv({ NODE_ENV: "development", NEXT_PUBLIC_MOCK_AUTH: "1" })
    const { isMockAuthEnabled } = await import("./env")
    expect(isMockAuthEnabled()).toBe(false)
  })
})
