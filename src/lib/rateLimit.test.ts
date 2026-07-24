import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isRateLimited } from "./rateLimit"

// These exercise the in-memory fallback path (no UPSTASH_* env in test), which
// is the code that runs in local dev and the safety net if Redis errors.
describe("isRateLimited (in-memory fallback)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests up to the limit, then blocks", async () => {
    const key = `test-block-${Math.random()}`
    // limit 3 in a 60s window: first 3 allowed, 4th blocked
    expect(await isRateLimited(key, 3, 60_000)).toBe(false)
    expect(await isRateLimited(key, 3, 60_000)).toBe(false)
    expect(await isRateLimited(key, 3, 60_000)).toBe(false)
    expect(await isRateLimited(key, 3, 60_000)).toBe(true)
  })

  it("keeps separate keys independent", async () => {
    const a = `test-a-${Math.random()}`
    const b = `test-b-${Math.random()}`
    expect(await isRateLimited(a, 1, 60_000)).toBe(false)
    expect(await isRateLimited(a, 1, 60_000)).toBe(true)
    // b is untouched by a's usage
    expect(await isRateLimited(b, 1, 60_000)).toBe(false)
  })

  it("frees up capacity once the window passes", async () => {
    const key = `test-window-${Math.random()}`
    expect(await isRateLimited(key, 1, 60_000)).toBe(false)
    expect(await isRateLimited(key, 1, 60_000)).toBe(true)
    // advance past the window — the old timestamp ages out
    vi.advanceTimersByTime(61_000)
    expect(await isRateLimited(key, 1, 60_000)).toBe(false)
  })
})
