import { describe, it, expect, vi, beforeEach } from "vitest"

// getRequestUserId now delegates to getCurrentUser rather than walking its own
// auth ladder. These tests pin that contract: the id passes through, and no
// second ladder reappears.
const getCurrentUser = vi.fn()

vi.mock("@/lib/getCurrentUser", () => ({
  getCurrentUser: () => getCurrentUser(),
}))

import { getRequestUserId } from "./getRequestUserId"

describe("getRequestUserId", () => {
  beforeEach(() => {
    getCurrentUser.mockReset()
  })

  it("returns the resolved user id", async () => {
    getCurrentUser.mockResolvedValue({ userId: "user-123", email: null, isDemo: false })
    expect(await getRequestUserId()).toBe("user-123")
  })

  it("returns null when nobody is signed in", async () => {
    getCurrentUser.mockResolvedValue({ userId: null, email: null, isDemo: false })
    expect(await getRequestUserId()).toBeNull()
  })

  it("returns the demo id when getCurrentUser reports a demo session", async () => {
    getCurrentUser.mockResolvedValue({ userId: "demo-user-id", email: null, isDemo: true })
    expect(await getRequestUserId()).toBe("demo-user-id")
  })

  // The whole point of the consolidation: identity decisions — including
  // whether the unsigned demo cookie counts — live in exactly one place.
  it("makes no identity decision of its own", async () => {
    getCurrentUser.mockResolvedValue({ userId: null, email: null, isDemo: true })
    expect(await getRequestUserId()).toBeNull()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)
  })
})
