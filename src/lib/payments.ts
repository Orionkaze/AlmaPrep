import type { TierId } from "@/config/plans"
import { SITE_URL } from "@/lib/siteConfig"
import { createAdminClient } from "@/lib/supabase/admin"
import * as crypto from "crypto"

export type CheckoutResult =
  | { status: "ok"; url: string }
  | { status: "notConfigured" }
  | { status: "error"; error: string }

/**
 * Start a Dodo Payments checkout session.
 */
export async function createDodoCheckout(req: {
  plan: TierId
  userId: string | null
  email: string | null
}): Promise<CheckoutResult> {
  const apiKey = process.env.DODO_API_KEY
  const productId = process.env.DODO_PRO_PRODUCT_ID
  if (!apiKey || !productId) return { status: "notConfigured" }

  try {
    const isLive = (apiKey.startsWith("live_") || process.env.DODO_MODE === "live") && process.env.DODO_MODE !== "test"
    const baseUrl = isLive ? "https://live.dodopayments.com" : "https://test.dodopayments.com"

    const response = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
          },
        ],
        customer: req.email ? { email: req.email } : undefined,
        metadata: req.userId ? { user_id: req.userId } : undefined,
        return_url: `${SITE_URL}/dashboard`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[createDodoCheckout] API error:", response.status, errorText)
      return { status: "error", error: `Payment provider error: ${response.statusText}` }
    }

    const data = await response.json()
    if (data.checkout_url) {
      return { status: "ok", url: data.checkout_url }
    }

    return { status: "error", error: "No checkout URL returned from payment provider" }
  } catch (err) {
    console.error("[createDodoCheckout] exception:", err)
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Failed to contact payment provider",
    }
  }
}

/**
 * Grant or revoke subscription tier for a user.
 * Bypasses RLS using the admin client.
 */
export async function grantTier(
  userId: string,
  toTier: TierId,
  source: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[grantTier] Granting tier "${toTier}" to user "${userId}" from source "${source}"`)

  const adminClient = createAdminClient()
  if (!adminClient) {
    // In production a null admin client means SUPABASE_SERVICE_ROLE_KEY is
    // missing, and we cannot record the grant at all. Reporting success there
    // would make the webhook 200, which tells the payment provider the event
    // was handled and stops it retrying — a paying customer would silently
    // never receive Pro. Fail so the retry happens.
    if (process.env.NODE_ENV === "production") {
      console.error(`[grantTier] No service-role client in production — refusing to report a grant that did not happen.`)
      return { success: false, error: "Service role key not configured" }
    }
    console.warn(`[grantTier] Admin client not available (local development/mock auth). Logging grant action.`)
    return { success: true }
  }

  try {
    // 1. Get current tier for audit log
    const { data: user, error: userError } = await adminClient
      .from("users")
      .select("subscription_tier")
      .eq("id", userId)
      .single()

    if (userError) {
      console.error(`[grantTier] Error fetching user ${userId}:`, userError)
      return { success: false, error: userError.message }
    }

    const fromTier = user?.subscription_tier || null

    // 2. Update user subscription tier
    const { error: updateError } = await adminClient
      .from("users")
      .update({ subscription_tier: toTier })
      .eq("id", userId)

    if (updateError) {
      console.error(`[grantTier] Error updating subscription tier for user ${userId}:`, updateError)
      return { success: false, error: updateError.message }
    }

    // 3. Create audit log in tier_grants
    const { error: grantError } = await adminClient
      .from("tier_grants")
      .insert({
        user_id: userId,
        from_tier: fromTier,
        to_tier: toTier,
        source: source,
        note: note || `Tier updated via ${source}`
      })

    if (grantError) {
      // Log error but don't fail the whole operation since tier update succeeded
      console.error(`[grantTier] Error writing tier grant audit log:`, grantError)
    }

    return { success: true }
  } catch (err) {
    console.error(`[grantTier] Unexpected error for user ${userId}:`, err)
    return { success: false, error: err instanceof Error ? err.message : "Internal error" }
  }
}

/** How far out of date a webhook timestamp may be before we reject it. */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

/**
 * Standard Webhooks requires the receiver to check the timestamp, not just the
 * signature. The signature stays valid forever, so without this a captured
 * request can be replayed at any point in the future — including a stale
 * `subscription.cancelled` replayed to strip someone's access.
 *
 * `timestamp` is seconds since the epoch, as a string.
 */
export function isTimestampFresh(
  timestamp: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = WEBHOOK_TOLERANCE_SECONDS
): boolean {
  const sent = Number(timestamp)
  if (!Number.isFinite(sent)) return false
  return Math.abs(nowSeconds - sent) <= toleranceSeconds
}

/**
 * Record that we have handled this webhook id, and report whether we are the
 * first to do so. The timestamp check above bounds replays to a five-minute
 * window; this closes that window and also absorbs the provider's own
 * at-least-once retries, which are normal traffic rather than an attack.
 *
 * Returns false ("do not process") when the id has been seen before. On an
 * infrastructure failure it returns true and logs: dropping a real payment
 * event is worse than handling a duplicate, and grantTier is idempotent.
 */
export async function claimWebhookEvent(
  eventId: string,
  provider: string
): Promise<boolean> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    if (process.env.NODE_ENV === "production") {
      console.error("[claimWebhookEvent] No service-role client in production — cannot deduplicate.")
    }
    return true
  }

  const { error } = await adminClient
    .from("webhook_events")
    .insert({ id: eventId, provider })

  if (!error) return true

  // 23505 = unique_violation: another delivery of this same event got here first.
  if (error.code === "23505") {
    console.log(`[claimWebhookEvent] Event ${eventId} already processed, skipping.`)
    return false
  }

  console.error("[claimWebhookEvent] Could not record event, processing anyway:", error.message)
  return true
}

/**
 * Whether a subscription event means the customer's access has actually ended.
 *
 * "Cancelled" usually means "will not renew" — they have paid through the end
 * of the current period and should keep Pro until it lapses, at which point
 * the provider sends an expiry event. Revoking on the cancellation itself takes
 * away time the customer already paid for.
 */
export function subscriptionAccessHasEnded(eventData: {
  status?: string
  next_billing_date?: string | null
  cancel_at_next_billing_date?: boolean
}): boolean {
  if (eventData.cancel_at_next_billing_date === true) return false

  const nextBilling = eventData.next_billing_date
  if (nextBilling) {
    const endsAt = Date.parse(nextBilling)
    if (Number.isFinite(endsAt) && endsAt > Date.now()) return false
  }

  return true
}

/**
 * Manually verifies the standard webhook signature using HMAC-SHA256.
 * Standard Webhooks / Svix signature format:
 * - Signed Content: `${webhook-id}.${webhook-timestamp}.${raw-body}`
 * - Secret: Base64-decoded string (with optional "whsec_" prefix removed)
 * - HMAC-SHA256 hash comparison in constant-time
 */
export function verifyWebhookSignature(
  id: string,
  timestamp: string,
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    const cleanSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret
    const secretBytes = Buffer.from(cleanSecret, "base64")

    const signedContent = `${id}.${timestamp}.${body}`
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64")

    const signatures = signature.split(" ")
    for (const sig of signatures) {
      const [version, signatureValue] = sig.split(",")
      if (version !== "v1") continue

      const expectedBuffer = Buffer.from(expectedSignature, "base64")
      const actualBuffer = Buffer.from(signatureValue, "base64")

      if (
        expectedBuffer.length === actualBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, actualBuffer)
      ) {
        return true
      }
    }
  } catch (err) {
    console.error("[dodo-webhook] Error verifying signature in helper:", err)
  }
  return false
}

