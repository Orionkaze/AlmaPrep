import type { TierId } from "@/config/plans"

export type CheckoutResult =
  | { status: "ok"; url: string }
  | { status: "notConfigured" }
  | { status: "error"; error: string }

/**
 * Start a Dodo Payments checkout. Not yet wired to the live API — per the owner,
 * the real Dodo key is connected after launch. Until DODO_API_KEY and
 * DODO_PRO_PRODUCT_ID are set this returns "notConfigured", which makes the
 * upgrade page show its "payments coming soon" state instead of a broken redirect.
 *
 * TODO(after live): POST to Dodo's checkout-session endpoint with the key and
 * product id plus success/cancel URLs, return the hosted checkout URL, and on the
 * webhook (signature-verified) call grantTier(userId, "pro", "dodo").
 */
export async function createDodoCheckout(req: {
  plan: TierId
  userId: string | null
  email: string | null
}): Promise<CheckoutResult> {
  const apiKey = process.env.DODO_API_KEY
  const productId = process.env.DODO_PRO_PRODUCT_ID
  if (!apiKey || !productId) return { status: "notConfigured" }

  void req
  return { status: "error", error: "Dodo checkout not implemented yet" }
}
