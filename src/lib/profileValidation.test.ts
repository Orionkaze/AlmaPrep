import { describe, it, expect } from "vitest"

import { friendlyProfileError, validateUsername } from "@/lib/profileValidation"

describe("friendlyProfileError", () => {
  // The raw Postgres text used to be shown on the onboarding screen, and since
  // the dashboard bounces profile-less users back there, it was a loop.
  it("explains a taken username instead of quoting the constraint", () => {
    const msg = friendlyProfileError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "users_username_key"',
    })
    expect(msg).toMatch(/already taken/i)
    expect(msg).not.toMatch(/constraint/i)
  })

  it("never leaks an unexpected database message", () => {
    const msg = friendlyProfileError({ code: "42P01", message: 'relation "users" does not exist' })
    expect(msg).not.toMatch(/relation/i)
    expect(msg).toMatch(/try again/i)
  })
})

describe("validateUsername", () => {
  it("accepts an ordinary name", () => {
    expect(validateUsername("Alex")).toBeNull()
    expect(validateUsername("  Priya  ")).toBeNull()
  })

  it("rejects empty or too-short names", () => {
    expect(validateUsername("")).toMatch(/at least 2/)
    expect(validateUsername("   ")).toMatch(/at least 2/)
    expect(validateUsername("a")).toMatch(/at least 2/)
  })

  it("rejects an over-long name before the database does", () => {
    expect(validateUsername("x".repeat(41))).toMatch(/under 40/)
  })
})
