"use server"

import { createDodoCheckout } from "@/lib/payments"
import { getCurrentUser } from "@/lib/getCurrentUser"
import type { TierId } from "@/config/plans"

export type CheckoutState =
  | { status: "idle" }
  | { status: "redirect"; url: string }
  | { status: "comingSoon" }
  | { status: "error"; error: string }

/**
 * Start a checkout for a paid plan. Until Dodo keys are present this returns
 * "comingSoon", which the upgrade page renders as a friendly notice. Never
 * throws. Signature is (prevState, formData) for useActionState.
 */
export async function startCheckout(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  try {
    const plan = (formData.get("plan") as string) === "pro" ? "pro" : null
    if (!plan) return { status: "error", error: "Unknown plan." }

    const { userId, email } = await getCurrentUser()
    const result = await createDodoCheckout({
      plan: plan as TierId,
      userId,
      email,
    })

    if (result.status === "ok") return { status: "redirect", url: result.url }
    if (result.status === "notConfigured") return { status: "comingSoon" }
    return { status: "error", error: result.error }
  } catch (err) {
    console.error("[checkout] failed:", err)
    return { status: "error", error: "Could not start checkout." }
  }
}
