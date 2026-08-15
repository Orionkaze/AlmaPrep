import { NextRequest, NextResponse } from "next/server"
import {
  claimWebhookEvent,
  grantTier,
  isTimestampFresh,
  subscriptionAccessHasEnded,
  verifyWebhookSignature,
} from "@/lib/payments"

/** Events that mean the customer is entitled to Pro right now. */
const GRANTING_EVENTS = new Set([
  "payment.succeeded",
  "subscription.active",
  "subscription.renewed",
])

/** Events that end entitlement outright, with no paid period left to honour. */
const REVOKING_EVENTS = new Set([
  "subscription.expired",
  "subscription.on_hold",
  "subscription.failed",
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Extract headers case-insensitively (handled by NextRequest headers list)
    const id = req.headers.get("webhook-id") || req.headers.get("svix-id")
    const timestamp = req.headers.get("webhook-timestamp") || req.headers.get("svix-timestamp")
    const signature = req.headers.get("webhook-signature") || req.headers.get("svix-signature")

    const secret = process.env.DODO_WEBHOOK_SECRET

    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[dodo-webhook] Missing DODO_WEBHOOK_SECRET in production!")
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
      }
      console.warn(
        "[dodo-webhook] DODO_WEBHOOK_SECRET is not configured. Skipping signature verification in development."
      )
    } else {
      if (!id || !timestamp || !signature) {
        console.error("[dodo-webhook] Missing required webhook signature headers")
        return NextResponse.json({ error: "Missing signature headers" }, { status: 400 })
      }

      // Freshness before signature: a valid signature never expires, so the
      // timestamp is the only thing standing between us and a replayed event.
      if (!isTimestampFresh(timestamp)) {
        console.error("[dodo-webhook] Webhook timestamp outside the accepted window")
        return NextResponse.json({ error: "Stale webhook timestamp" }, { status: 400 })
      }

      const isValid = verifyWebhookSignature(id, timestamp, signature, body, secret)
      if (!isValid) {
        console.error("[dodo-webhook] Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }

      // Only claim an id we have actually authenticated, otherwise anyone
      // could burn ids and make us drop the real deliveries.
      const isFirstDelivery = await claimWebhookEvent(id, "dodo")
      if (!isFirstDelivery) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
      }
    }

    // Parse the verified JSON payload
    const payload = JSON.parse(body)
    const eventType = payload.type
    const eventData = payload.data

    console.log(`[dodo-webhook] Received event: ${eventType}`)

    if (!eventData) {
      console.error("[dodo-webhook] Missing event data object")
      return NextResponse.json({ error: "Missing event data" }, { status: 400 })
    }

    const userId = eventData.metadata?.user_id

    const isGranting = GRANTING_EVENTS.has(eventType)
    const isRevoking = REVOKING_EVENTS.has(eventType)
    const isCancellation = eventType === "subscription.cancelled"

    if (!isGranting && !isRevoking && !isCancellation) {
      console.log(`[dodo-webhook] Unhandled event type: ${eventType}. Ignoring.`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (!userId) {
      console.error(`[dodo-webhook] No user_id found in metadata for event ${eventType}`)
      return NextResponse.json({ error: "No user_id in metadata" }, { status: 400 })
    }

    if (isCancellation && !subscriptionAccessHasEnded(eventData)) {
      // They cancelled but have paid through the end of the current period.
      // Leave Pro in place; the expiry event is what takes it away.
      console.log(`[dodo-webhook] Cancellation received; access runs to end of period. No change.`)
      return NextResponse.json({ received: true, deferred: true }, { status: 200 })
    }

    const toTier = isGranting ? "pro" : "free"
    const verb = isGranting ? "Granted" : "Revoked"
    const result = await grantTier(userId, toTier, "dodo", `${verb} via event: ${eventType}`)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || `Failed to ${isGranting ? "grant" : "revoke"} tier` },
        { status: 500 }
      )
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[dodo-webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
