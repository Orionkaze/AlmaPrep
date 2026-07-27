import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const mockPipelineExec = vi.fn()
const mockZRem = vi.fn()

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {
      pipeline = vi.fn(() => ({
        zremrangebyscore: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zrange: vi.fn().mockReturnThis(),
        pexpire: vi.fn().mockReturnThis(),
        exec: mockPipelineExec,
      }))
      zrem = mockZRem
    },
  }
})

describe("rate limiter", () => {
  let isRateLimited: typeof import("./rateLimit").isRateLimited
  let rateLimit: typeof import("./rateLimit").rateLimit
  let checkRateLimit: typeof import("./rateLimit").checkRateLimit
  let getRateLimitHeaders: typeof import("./rateLimit").getRateLimitHeaders

  describe("Header Generation", () => {
    beforeEach(async () => {
      vi.resetModules()
      const mod = await import("./rateLimit")
      getRateLimitHeaders = mod.getRateLimitHeaders
    })

    it("generates standard rate limit headers for allowed requests", () => {
      const result = {
        allowed: true,
        remaining: 4,
        limit: 5,
        reset: 1720000000,
        retryAfter: 0,
      }
      const headers = getRateLimitHeaders(result)
      expect(headers["X-RateLimit-Limit"]).toBe("5")
      expect(headers["X-RateLimit-Remaining"]).toBe("4")
      expect(headers["X-RateLimit-Reset"]).toBe("1720000000")
      expect(headers["Retry-After"]).toBeUndefined()
    })

    it("includes Retry-After header for rejected requests", () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 5,
        reset: 1720000060,
        retryAfter: 60,
      }
      const headers = getRateLimitHeaders(result)
      expect(headers["X-RateLimit-Limit"]).toBe("5")
      expect(headers["X-RateLimit-Remaining"]).toBe("0")
      expect(headers["X-RateLimit-Reset"]).toBe("1720000060")
      expect(headers["Retry-After"]).toBe("60")
    })
  })

  describe("checkRateLimit (in-memory fallback & resolved logic)", () => {
    beforeEach(async () => {
      vi.resetModules()
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      delete process.env.RATE_LIMIT_MAX_REQUESTS
      delete process.env.RATE_LIMIT_WINDOW_MS

      const mod = await import("./rateLimit")
      checkRateLimit = mod.checkRateLimit
      rateLimit = mod.rateLimit
      isRateLimited = mod.isRateLimited

      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z")) // timestamp = 1767225600000
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("loads default limits and window sizes when no config or env is set", async () => {
      // Sensible defaults should be: limit=20, windowMs=60000
      const result = await checkRateLimit("unknown-key")
      expect(result.limit).toBe(20)
    })

    it("loads limits and window sizes from environment variables", async () => {
      process.env.RATE_LIMIT_MAX_REQUESTS = "12"
      process.env.RATE_LIMIT_WINDOW_MS = "30000"

      const result = await checkRateLimit("unknown-key")
      expect(result.limit).toBe(12)

      // Test window in-memory fallback
      await checkRateLimit("unknown-key") // 2nd hit
      vi.advanceTimersByTime(31_000)
      const resultAfterWindow = await checkRateLimit("unknown-key")
      expect(resultAfterWindow.remaining).toBe(11) // reset should have emptied the list
    })

    it("resolves endpoint configs by key prefix", async () => {
      // login has limit 5
      const resultLogin = await checkRateLimit("login:user@example.com")
      expect(resultLogin.limit).toBe(5)

      // signup has limit 3
      const resultSignup = await checkRateLimit("signup:user@example.com")
      expect(resultSignup.limit).toBe(3)
    })

    it("resolves endpoint configs by string configuration argument", async () => {
      // Pass chat (limit 50) as config override
      const result = await checkRateLimit("some-key", "chat")
      expect(result.limit).toBe(50)
    })

    it("returns correct metadata fields including remaining, reset, and retryAfter", async () => {
      const key = "login:meta-test"
      // login configuration: 5 requests / 60s
      let result = await checkRateLimit(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
      expect(result.retryAfter).toBe(0)
      // reset time should be: 1767225600000 + 60000 = 1767225660000 ms (1767225660 sec)
      expect(result.reset).toBe(1767225660)

      // Exhaust the limit
      await checkRateLimit(key)
      await checkRateLimit(key)
      await checkRateLimit(key)
      await checkRateLimit(key)

      // 6th request should be blocked
      result = await checkRateLimit(key)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBe(60) // windowMs is 60s, none of them aged out
    })

    it("calculates accurate Retry-After and reset timing as window shifts", async () => {
      const key = "signup:retry-test" // 3 requests / hour (3600000 ms)
      await checkRateLimit(key) // t = 0
      vi.advanceTimersByTime(10 * 60 * 1000) // t = 10 mins
      await checkRateLimit(key)
      vi.advanceTimersByTime(15 * 60 * 1000) // t = 25 mins
      await checkRateLimit(key)

      // Now we are at limit (3 hits)
      let result = await checkRateLimit(key)
      expect(result.allowed).toBe(false)
      // Oldest is at t = 0 (10 + 15 = 25 minutes ago). 
      // Reset is at t = 60 mins. Time remaining = 35 minutes (2100 seconds).
      expect(result.retryAfter).toBe(2100)

      // Advance past the 1-hour mark from the first hit (e.g. by 36 minutes, total elapsed 61 minutes)
      vi.advanceTimersByTime(36 * 60 * 1000) // total elapsed 61 mins.
      // first hit (at 0) is now 61 mins ago, so it ages out. Active hits are at 10 and 25 (which are 51 and 36 mins ago).
      result = await checkRateLimit(key)
      expect(result.allowed).toBe(true) // allowed since we only have 2 active hits in the last 60 minutes
      expect(result.remaining).toBe(0) // now we have 3 hits again (10, 25, 61)
    })

    it("preserves backward compatibility wrapper features", async () => {
      const key = `compat-test-${Math.random()}`
      // rateLimit synchronous function
      expect(rateLimit(key, 1, 60_000, Date.now())).toBe(true)
      expect(rateLimit(key, 1, 60_000, Date.now())).toBe(false)

      const key2 = `compat-test2-${Math.random()}`
      // isRateLimited asynchronous wrapper (inverted semantics: returns true if rate limited)
      expect(await isRateLimited(key2, 1, 60_000)).toBe(false)
      expect(await isRateLimited(key2, 1, 60_000)).toBe(true)
    })

    it("handles concurrent requests", async () => {
      const key = "login:concurrent-test"
      const promises = [
        checkRateLimit(key),
        checkRateLimit(key),
        checkRateLimit(key),
      ]
      const results = await Promise.all(promises)
      const allowedCount = results.filter(r => r.allowed).length
      expect(allowedCount).toBe(3)
      
      const lastResult = await checkRateLimit(key)
      expect(lastResult.remaining).toBe(1) // 4 requests total, remaining = 5 - 4 = 1
    })
  })

  describe("checkRateLimit (Redis path)", () => {
    beforeEach(async () => {
      vi.resetModules()
      process.env.UPSTASH_REDIS_REST_URL = "http://mock-redis"
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token"

      const mod = await import("./rateLimit")
      checkRateLimit = mod.checkRateLimit
      isRateLimited = mod.isRateLimited

      mockPipelineExec.mockReset()
      mockZRem.mockReset()
    })

    afterEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it("calls Redis pipeline and returns correct metadata when allowed", async () => {
      const now = Date.now()
      // pipeline returns: zremrangebyscore results, zadd results, zcard = 2, oldest zrange member, pexpire
      mockPipelineExec.mockResolvedValue([0, 1, 2, [`${now}:random`], 1])

      const result = await checkRateLimit("login:redis-user")
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(3) // 5 - 2
      expect(result.limit).toBe(5)
      expect(result.retryAfter).toBe(0)
      expect(mockPipelineExec).toHaveBeenCalledTimes(1)
      expect(mockZRem).not.toHaveBeenCalled()
    })

    it("returns blocked metadata and triggers zrem on limit exceed", async () => {
      const now = Date.now()
      // limit is 5. zcard returned 6. oldest member timestamp is 50 seconds ago.
      const oldestTime = now - 50000
      mockPipelineExec.mockResolvedValue([0, 1, 6, [`${oldestTime}:random`], 1])
      mockZRem.mockResolvedValue(1)

      const result = await checkRateLimit("login:redis-blocked")
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBe(10) // 60s window - 50s elapsed = 10s remaining
      expect(mockPipelineExec).toHaveBeenCalledTimes(1)

      // Wait for asynchronous zrem call to complete
      await new Promise((resolve) => setTimeout(resolve, 15))
      expect(mockZRem).toHaveBeenCalledTimes(1)
    })

    it("gracefully falls back to in-memory on Redis error, and throttles error logs", async () => {
      mockPipelineExec.mockRejectedValue(new Error("Network connection lost"))
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // First call fails Redis, falls back to in-memory, logs error
      const result1 = await checkRateLimit("login:redis-err-test")
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(4) // fallback login limit = 5
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)

      // Second call fails Redis, falls back, BUT throttles the log (no new console.error)
      const result2 = await checkRateLimit("login:redis-err-test")
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(3)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1) // Still 1 due to throttle!

      consoleErrorSpy.mockRestore()
    })
  })
})


