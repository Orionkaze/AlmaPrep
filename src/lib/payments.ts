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
  } catch (err: any) {
    console.error("[createDodoCheckout] exception:", err)
    return { status: "error", error: err.message || "Failed to contact payment provider" }
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
  } catch (err: any) {
    console.error(`[grantTier] Unexpected error for user ${userId}:`, err)
    return { success: false, error: err.message || "Internal error" }
  }
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

