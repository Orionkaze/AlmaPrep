import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"
import { grantTier } from "@/lib/payments"

vi.mock("@/lib/payments", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/payments")>()
  return {
    ...original,
    grantTier: vi.fn(),
  }
})

describe("Dodo Webhook Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("skips signature verification in non-production environments when secret is unset", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    const mockPayload = {
      type: "payment.succeeded",
      data: {
        id: "pay_123",
        metadata: {
          user_id: "user_dev_123",
        },
      },
    }

    vi.mocked(grantTier).mockResolvedValue({ success: true })

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify(mockPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(grantTier).toHaveBeenCalledWith("user_dev_123", "pro", "dodo", "Granted via event: payment.succeeded")
  })

  it("returns 500 in production when DODO_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe("Webhook secret not configured")
  })

  it("returns 400 when missing signature headers when secret is set", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Missing signature headers")
  })

  it("returns 401 when signature verification fails", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      headers: {
        "webhook-id": "msg_1",
        "webhook-timestamp": "160000",
        "webhook-signature": "v1,invalidhash",
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("Invalid signature")
  })

  it("downgrades user tier on subscription cancellation event", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    const mockPayload = {
      type: "subscription.cancelled",
      data: {
        id: "sub_123",
        metadata: {
          user_id: "user_pro_123",
        },
      },
    }

    vi.mocked(grantTier).mockResolvedValue({ success: true })

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify(mockPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(grantTier).toHaveBeenCalledWith("user_pro_123", "free", "dodo", "Revoked via event: subscription.cancelled")
  })
})
