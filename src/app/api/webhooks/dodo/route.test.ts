import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { POST } from "./route"
import { NextRequest } from "next/server"
import { grantTier, claimWebhookEvent } from "@/lib/payments"

vi.mock("@/lib/payments", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/payments")>()
  return {
    ...original,
    grantTier: vi.fn(),
    claimWebhookEvent: vi.fn(async () => true),
  }
})

/** A `webhook-timestamp` the freshness check will accept. */
function nowSeconds(): string {
  return String(Math.floor(Date.now() / 1000))
}

describe("Dodo Webhook Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(claimWebhookEvent).mockResolvedValue(true)
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
        "webhook-timestamp": nowSeconds(),
        "webhook-signature": "v1,invalidhash",
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("Invalid signature")
  })

  it("rejects a replayed delivery whose timestamp is outside the window", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      headers: {
        "webhook-id": "msg_replay",
        // Valid once, captured, and sent again an hour later.
        "webhook-timestamp": String(Math.floor(Date.now() / 1000) - 3600),
        "webhook-signature": "v1,whatever",
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Stale webhook timestamp")
  })

  it("ignores a redelivery of an event id it has already handled", async () => {
    vi.stubEnv("NODE_ENV", "production")
    // A secret has to be set for the route to take the verified path at all,
    // which is the only path that de-duplicates.
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=")
    vi.mocked(claimWebhookEvent).mockResolvedValue(false)

    const timestamp = nowSeconds()
    const body = JSON.stringify({
      type: "payment.succeeded",
      data: { metadata: { user_id: "user_dupe" } },
    })

    // Sign the body the way the provider would so verification passes and we
    // reach the de-duplication step.
    const crypto = await import("crypto")
    const secretBytes = Buffer.from("MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=", "base64")
    const expected = crypto
      .createHmac("sha256", secretBytes)
      .update(`msg_dupe.${timestamp}.${body}`)
      .digest("base64")

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      headers: {
        "webhook-id": "msg_dupe",
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${expected}`,
      },
      body,
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(grantTier).not.toHaveBeenCalled()
  })

  it("keeps Pro when a cancellation still has paid time left", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    const mockPayload = {
      type: "subscription.cancelled",
      data: {
        id: "sub_123",
        cancel_at_next_billing_date: true,
        next_billing_date: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        metadata: { user_id: "user_pro_123" },
      },
    }

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify(mockPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, deferred: true })
    expect(grantTier).not.toHaveBeenCalled()
  })

  it("downgrades on cancellation once the paid period is over", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    const mockPayload = {
      type: "subscription.cancelled",
      data: {
        id: "sub_123",
        next_billing_date: new Date(Date.now() - 86_400_000).toISOString(),
        metadata: { user_id: "user_pro_123" },
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

  it("downgrades immediately when the subscription expires", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    vi.mocked(grantTier).mockResolvedValue({ success: true })

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify({
        type: "subscription.expired",
        data: { metadata: { user_id: "user_pro_123" } },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(grantTier).toHaveBeenCalledWith("user_pro_123", "free", "dodo", "Revoked via event: subscription.expired")
  })

  it("returns 500 when the grant could not be recorded, so the provider retries", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("DODO_WEBHOOK_SECRET", "")

    vi.mocked(grantTier).mockResolvedValue({ success: false, error: "Service role key not configured" })

    const request = new NextRequest("http://localhost/api/webhooks/dodo", {
      method: "POST",
      body: JSON.stringify({
        type: "payment.succeeded",
        data: { metadata: { user_id: "user_paid" } },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
