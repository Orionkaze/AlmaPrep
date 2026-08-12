import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  verifyWebhookSignature,
  createDodoCheckout,
  isTimestampFresh,
  subscriptionAccessHasEnded,
} from "./payments"
import * as crypto from "crypto"

describe("payments", () => {
  describe("verifyWebhookSignature", () => {
    const dummySecretText = "12345678901234567890123456789012"
    const dummySecretBase64 = Buffer.from(dummySecretText).toString("base64")
    const webhookSecret = `whsec_${dummySecretBase64}`

    const msgId = "evt_test123"
    const timestamp = "1700000000"
    const payloadBody = '{"type":"payment.succeeded","data":{"id":"pay_123"}}'

    function computeSignature(id: string, ts: string, body: string, secretKey: string): string {
      const signedContent = `${id}.${ts}.${body}`
      const hmac = crypto.createHmac("sha256", Buffer.from(secretKey))
      return hmac.update(signedContent).digest("base64")
    }

    it("verifies a valid signature successfully", () => {
      const sigHash = computeSignature(msgId, timestamp, payloadBody, dummySecretText)
      const signatureHeader = `v1,${sigHash}`

      const isValid = verifyWebhookSignature(msgId, timestamp, signatureHeader, payloadBody, webhookSecret)
      expect(isValid).toBe(true)
    })

    it("handles multiple signatures in the header, verifying if at least one is valid", () => {
      const sigHash = computeSignature(msgId, timestamp, payloadBody, dummySecretText)
      const signatureHeader = `v1,invalidhash v1,${sigHash} v2,someother`

      const isValid = verifyWebhookSignature(msgId, timestamp, signatureHeader, payloadBody, webhookSecret)
      expect(isValid).toBe(true)
    })

    it("fails verification if the signature value is invalid", () => {
      const signatureHeader = "v1,invalidbase64hashhere"

      const isValid = verifyWebhookSignature(msgId, timestamp, signatureHeader, payloadBody, webhookSecret)
      expect(isValid).toBe(false)
    })

    it("fails verification if signature header version is unsupported (not v1)", () => {
      const sigHash = computeSignature(msgId, timestamp, payloadBody, dummySecretText)
      const signatureHeader = `v2,${sigHash}`

      const isValid = verifyWebhookSignature(msgId, timestamp, signatureHeader, payloadBody, webhookSecret)
      expect(isValid).toBe(false)
    })

    it("fails verification if the payload body has been tampered with", () => {
      const sigHash = computeSignature(msgId, timestamp, payloadBody, dummySecretText)
      const signatureHeader = `v1,${sigHash}`
      const tamperedBody = payloadBody + " "

      const isValid = verifyWebhookSignature(msgId, timestamp, signatureHeader, tamperedBody, webhookSecret)
      expect(isValid).toBe(false)
    })

    it("fails verification if the timestamp is different", () => {
      const sigHash = computeSignature(msgId, timestamp, payloadBody, dummySecretText)
      const signatureHeader = `v1,${sigHash}`
      const differentTimestamp = "1700000001"

      const isValid = verifyWebhookSignature(msgId, differentTimestamp, signatureHeader, payloadBody, webhookSecret)
      expect(isValid).toBe(false)
    })
  })

  describe("createDodoCheckout", () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      vi.stubGlobal("fetch", vi.fn())
    })

    afterEach(() => {
      process.env = originalEnv
      vi.unstubAllGlobals()
    })

    it("returns notConfigured if environment variables are not set", async () => {
      delete process.env.DODO_API_KEY
      delete process.env.DODO_PRO_PRODUCT_ID

      const result = await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(result.status).toBe("notConfigured")
    })

    it("creates a checkout session and returns the checkout URL on success", async () => {
      process.env.DODO_API_KEY = "test_key_123"
      process.env.DODO_PRO_PRODUCT_ID = "pdt_123"

      const mockCheckoutUrl = "https://checkout.dodopayments.com/buy/pdt_123?session=xyz"

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ checkout_url: mockCheckoutUrl }),
      } as Response)

      const result = await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(result).toEqual({ status: "ok", url: mockCheckoutUrl })
      expect(fetch).toHaveBeenCalledWith(
        "https://test.dodopayments.com/checkouts",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Authorization": "Bearer test_key_123",
            "Content-Type": "application/json",
          },
          body: expect.stringContaining('"user_id":"user_123"'),
        })
      )
    })

    it("creates a checkout session using live mode when DODO_API_KEY starts with live_", async () => {
      process.env.DODO_API_KEY = "live_key_123"
      process.env.DODO_PRO_PRODUCT_ID = "pdt_123"

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ checkout_url: "https://checkout.dodopayments.com/buy/pdt_123" }),
      } as Response)

      await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(fetch).toHaveBeenCalledWith(
        "https://live.dodopayments.com/checkouts",
        expect.any(Object)
      )
    })

    it("creates a checkout session using live mode when DODO_MODE is set to live", async () => {
      process.env.DODO_API_KEY = "test_key_123" // doesn't start with live_
      process.env.DODO_PRO_PRODUCT_ID = "pdt_123"
      process.env.DODO_MODE = "live"

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ checkout_url: "https://checkout.dodopayments.com/buy/pdt_123" }),
      } as Response)

      await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(fetch).toHaveBeenCalledWith(
        "https://live.dodopayments.com/checkouts",
        expect.any(Object)
      )
    })

    it("creates a checkout session using test mode when DODO_MODE is set to test even if key starts with live_", async () => {
      process.env.DODO_API_KEY = "live_key_123"
      process.env.DODO_PRO_PRODUCT_ID = "pdt_123"
      process.env.DODO_MODE = "test"

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ checkout_url: "https://checkout.dodopayments.com/buy/pdt_123" }),
      } as Response)

      await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(fetch).toHaveBeenCalledWith(
        "https://test.dodopayments.com/checkouts",
        expect.any(Object)
      )
    })

    it("returns error status on failed fetch", async () => {
      process.env.DODO_API_KEY = "test_key_123"
      process.env.DODO_PRO_PRODUCT_ID = "pdt_123"

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid parameters",
      } as Response)

      const result = await createDodoCheckout({
        plan: "pro",
        userId: "user_123",
        email: "test@example.com",
      })

      expect(result.status).toBe("error")
      if (result.status === "error") {
        expect(result.error).toContain("Payment provider error: Bad Request")
      }
    })
  })

  describe("isTimestampFresh", () => {
    const now = 1_700_000_000

    it("accepts a timestamp from a moment ago", () => {
      expect(isTimestampFresh(String(now - 30), now)).toBe(true)
    })

    it("accepts a timestamp slightly in the future, for clock skew", () => {
      expect(isTimestampFresh(String(now + 30), now)).toBe(true)
    })

    it("rejects a replay from an hour later", () => {
      expect(isTimestampFresh(String(now - 3600), now)).toBe(false)
    })

    it("rejects a timestamp that is not a number", () => {
      expect(isTimestampFresh("not-a-timestamp", now)).toBe(false)
      expect(isTimestampFresh("", now)).toBe(false)
    })
  })

  describe("subscriptionAccessHasEnded", () => {
    const inTwoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString()
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()

    it("keeps access when the subscription is set to lapse at the next billing date", () => {
      expect(
        subscriptionAccessHasEnded({ cancel_at_next_billing_date: true, next_billing_date: inTwoWeeks })
      ).toBe(false)
    })

    it("keeps access while there is still a future billing date", () => {
      expect(subscriptionAccessHasEnded({ next_billing_date: inTwoWeeks })).toBe(false)
    })

    it("ends access once the paid period is behind us", () => {
      expect(subscriptionAccessHasEnded({ next_billing_date: yesterday })).toBe(true)
    })

    it("ends access when the payload says nothing about a remaining period", () => {
      expect(subscriptionAccessHasEnded({})).toBe(true)
      expect(subscriptionAccessHasEnded({ next_billing_date: null })).toBe(true)
    })
  })
})
