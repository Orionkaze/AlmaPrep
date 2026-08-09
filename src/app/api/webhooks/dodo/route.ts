import { NextRequest, NextResponse } from "next/server"
import { grantTier, verifyWebhookSignature } from "@/lib/payments"

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

      const isValid = verifyWebhookSignature(id, timestamp, signature, body, secret)
      if (!isValid) {
        console.error("[dodo-webhook] Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
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

    switch (eventType) {
      case "payment.succeeded":
      case "subscription.active":
      case "subscription.renewed":
        if (!userId) {
          console.error(`[dodo-webhook] No user_id found in metadata for event ${eventType}`)
          return NextResponse.json({ error: "No user_id in metadata" }, { status: 400 })
        }
        const grantResult = await grantTier(userId, "pro", "dodo", `Granted via event: ${eventType}`)
        if (!grantResult.success) {
          return NextResponse.json({ error: grantResult.error || "Failed to grant tier" }, { status: 500 })
        }
        break

      case "subscription.cancelled":
      case "subscription.on_hold":
      case "subscription.failed":
        if (!userId) {
          console.error(`[dodo-webhook] No user_id found in metadata for event ${eventType}`)
          return NextResponse.json({ error: "No user_id in metadata" }, { status: 400 })
        }
        const revokeResult = await grantTier(userId, "free", "dodo", `Revoked via event: ${eventType}`)
        if (!revokeResult.success) {
          return NextResponse.json({ error: revokeResult.error || "Failed to revoke tier" }, { status: 500 })
        }
        break

      default:
        console.log(`[dodo-webhook] Unhandled event type: ${eventType}. Ignoring.`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error("[dodo-webhook] Error processing webhook:", error)
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
