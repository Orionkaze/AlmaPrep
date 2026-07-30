import { describe, it, expect } from "vitest"
import { normalizeLocalDate } from "./streak"

// 2026-07-30T12:00:00Z
const NOW = Date.parse("2026-07-30T12:00:00Z")

describe("normalizeLocalDate", () => {
  it("keeps the client's date when it matches UTC", () => {
    expect(normalizeLocalDate("2026-07-30", NOW)).toBe("2026-07-30")
  })

  // Real UTC offsets run from -12 to +14, so a genuine local date is never more
  // than a day away from the server's.
  it("keeps a date one day either side, for far-flung timezones", () => {
    expect(normalizeLocalDate("2026-07-31", NOW)).toBe("2026-07-31")
    expect(normalizeLocalDate("2026-07-29", NOW)).toBe("2026-07-29")
  })

  // This is the streak-inflation defence: updateStreak increments whenever the
  // new date is exactly one day after the stored one, so replaying the call
  // with 2026-01-01, 2026-01-02, … used to walk current_streak up arbitrarily.
  it("rejects a date further away than any timezone could produce", () => {
    expect(normalizeLocalDate("2026-01-01", NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate("2030-12-25", NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate("2026-08-02", NOW)).toBe("2026-07-30")
  })

  it("falls back to UTC for malformed, empty or missing input", () => {
    expect(normalizeLocalDate("", NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate(null, NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate(undefined, NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate("30-07-2026", NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate("2026-13-45", NOW)).toBe("2026-07-30")
    expect(normalizeLocalDate("' or 1=1 --", NOW)).toBe("2026-07-30")
  })

  it("handles a month boundary", () => {
    const endOfMonth = Date.parse("2026-07-31T23:00:00Z")
    expect(normalizeLocalDate("2026-08-01", endOfMonth)).toBe("2026-08-01")
  })
})
