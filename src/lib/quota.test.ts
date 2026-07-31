import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkInterviewAllowance } from "./quota"

// Mock dependencies
const mockUpsert = vi.fn()
const mockSelect = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    // This test is about the distributed lock protecting the NON-atomic
    // read-then-write path, so the mock models a database where the
    // consume_interview RPC has not been migrated yet — exactly what
    // PostgREST returns for a missing function. checkInterviewAllowance then
    // falls through to the select/upsert pair the lock exists to serialise.
    rpc: () => ({
      maybeSingle: async () => ({
        data: null,
        error: { message: "function public.consume_interview does not exist" }
      })
    }),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: mockSelect
          })
        })
      }),
      upsert: mockUpsert
    })
  })
}))

vi.mock("@/config/plans", () => ({
  isPaywallEnabled: () => true
}))

vi.mock("@/lib/entitlements", () => ({
  getEntitlements: () => ({
    monthlyInterviews: 3 // limit is 3
  })
}))

vi.mock("@/lib/rateLimit", () => ({
  getRedisClient: () => null // Use in-memory lock fallback
}))

describe("Quota Concurrency checkInterviewAllowance", () => {
  beforeEach(() => {
    mockSelect.mockReset()
    mockUpsert.mockReset()
  })

  it("permits at most 1 allowed request when 20 are fired concurrently, rejecting the rest as rate_limited", async () => {
    let databaseCount = 0

    // Mock select to return the databaseCount, but simulate async latency
    mockSelect.mockImplementation(async () => {
      // Simulate database read latency
      await new Promise(resolve => setTimeout(resolve, 50))
      return { data: { count: databaseCount }, error: null }
    })

    // Mock upsert to increment databaseCount, simulating write latency
    mockUpsert.mockImplementation(async (record: { count: number }) => {
      await new Promise(resolve => setTimeout(resolve, 30))
      databaseCount = record.count
      return { error: null }
    })

    // Fire 20 concurrent checks (consume = true)
    const promises = Array.from({ length: 20 }).map(() =>
      checkInterviewAllowance("test-user-concurrency", "free", Date.now(), true)
    )

    const results = await Promise.all(promises)

    // Calculate how many requests succeeded
    const allowed = results.filter(r => r.allowed)
    const rateLimited = results.filter(r => !r.allowed && r.reason === "rate_limited")

    // Assertions: 1 request should be allowed, 19 rejected as rate_limited/concurrency lock
    expect(allowed.length).toBe(1)
    expect(rateLimited.length).toBe(19)
  })
})
