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
        pexpire: vi.fn().mockReturnThis(),
        exec: mockPipelineExec,
      }))
      zrem = mockZRem
    },
  }
})

describe("rate limiter", () => {
  let isRateLimited: typeof import("./rateLimit").isRateLimited

  describe("isRateLimited (in-memory fallback)", () => {
    beforeEach(async () => {
      vi.resetModules()
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const mod = await import("./rateLimit")
      isRateLimited = mod.isRateLimited

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

  describe("isRateLimited (Redis path)", () => {
    beforeEach(async () => {
      vi.resetModules()
      process.env.UPSTASH_REDIS_REST_URL = "http://mock-redis"
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token"

      const mod = await import("./rateLimit")
      isRateLimited = mod.isRateLimited

      mockPipelineExec.mockReset()
      mockZRem.mockReset()
    })

    afterEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it("calls Redis pipeline and returns false when under the limit", async () => {
      mockPipelineExec.mockResolvedValue([0, 1, 2, 1]) // zcard returned 2 (limit 3)
      const limited = await isRateLimited("test-redis-key", 3, 60_000)
      expect(limited).toBe(false)
      expect(mockPipelineExec).toHaveBeenCalledTimes(1)
      expect(mockZRem).not.toHaveBeenCalled()
    })

    it("calls Redis pipeline, returns true and triggers zrem when limit exceeded", async () => {
      mockPipelineExec.mockResolvedValue([0, 1, 4, 1]) // zcard returned 4 (limit 3)
      mockZRem.mockResolvedValue(1)
      const limited = await isRateLimited("test-redis-key", 3, 60_000)
      expect(limited).toBe(true)
      expect(mockPipelineExec).toHaveBeenCalledTimes(1)
      // Wait for asynchronous zrem call to trigger
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(mockZRem).toHaveBeenCalledTimes(1)
    })

    it("gracefully falls back to in-memory rate limiter when Redis throws an error", async () => {
      mockPipelineExec.mockRejectedValue(new Error("Redis connection failure"))
      const limited1 = await isRateLimited("test-redis-fallback", 1, 60_000)
      expect(limited1).toBe(false)
      const limited2 = await isRateLimited("test-redis-fallback", 1, 60_000)
      expect(limited2).toBe(true)
    })
  })
})

