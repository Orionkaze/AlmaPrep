import { safeNextPath, allowedHost } from "@/lib/authCallbackUtils"

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }))
vi.mock("next/headers", () => ({ cookies: async () => ({ set: () => {} }) }))
vi.mock("@/lib/siteConfig", () => ({ SITE_URL: "https://almaprep.example" }))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("safeNextPath", () => {
  it("keeps an ordinary same-site path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard")
    expect(safeNextPath("/interview/setup?x=1")).toBe("/interview/setup?x=1")
  })

  it("defaults when absent", () => {
    expect(safeNextPath(null)).toBe("/onboarding")
    expect(safeNextPath("")).toBe("/onboarding")
  })

  // Each of these would otherwise send the user to another origin after a
  // successful sign-in, which is the classic post-auth open redirect.
  it("rejects anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/onboarding")
    expect(safeNextPath("//evil.example")).toBe("/onboarding")
    expect(safeNextPath("/\\evil.example")).toBe("/onboarding")
    expect(safeNextPath("javascript:alert(1)")).toBe("/onboarding")
    expect(safeNextPath("dashboard")).toBe("/onboarding")
  })
})

describe("allowedHost", () => {
  const origin = "https://almaprep.example"

  it("accepts the configured site host", () => {
    expect(allowedHost("almaprep.example", origin)).toBe("almaprep.example")
  })

  it("accepts the request's own origin host", () => {
    expect(allowedHost("preview.vercel.app", "https://preview.vercel.app")).toBe("preview.vercel.app")
  })

  it("accepts a host configured via NEXTAUTH_URL", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://auth.almaprep.example")
    expect(allowedHost("auth.almaprep.example", origin)).toBe("auth.almaprep.example")
  })

  // x-forwarded-host is just a request header; trusting it verbatim let an
  // attacker choose where sign-in landed.
  it("rejects a host we were not deployed under", () => {
    expect(allowedHost("evil.example", origin)).toBeNull()
    expect(allowedHost("almaprep.example.evil.example", origin)).toBeNull()
  })

  it("returns null when the header is absent", () => {
    expect(allowedHost(null, origin)).toBeNull()
  })
})
