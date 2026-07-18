import { createAdminClient } from "@/lib/supabase/admin"
import { getEntitlements } from "@/lib/entitlements"
import { isPaywallEnabled, type TierId } from "@/config/plans"

export type AllowanceResult = {
  allowed: boolean
  reason?: "quota"
  used?: number
  limit?: number
}

function currentMonth(now: number): string {
  return new Date(now).toISOString().substring(0, 7) // "YYYY-MM"
}

/**
 * Decide whether a user may start a NEW interview this month, and record it if
 * so. Behaviour is deliberately conservative:
 *
 * - Paywall OFF (default) → always allowed, no DB touch, no behaviour change.
 * - "unlimited" tier → always allowed.
 * - No admin client (key missing) → fail OPEN (allow) and log. A missing key
 *   must never lock users out.
 * - Only a genuine over-limit case fails CLOSED.
 *
 * Uses the service-role client so a user cannot reset their own counter (the
 * anon client is blocked by RLS once the migration is applied).
 *
 * Pass `consume: false` to check without incrementing (for pre-flight UI).
 */
export async function checkInterviewAllowance(
  userId: string,
  tier: TierId,
  now: number,
  consume: boolean
): Promise<AllowanceResult> {
  if (!isPaywallEnabled()) return { allowed: true }

  const limit = getEntitlements(tier).monthlyInterviews
  if (limit === "unlimited") return { allowed: true }

  const admin = createAdminClient()
  if (!admin) {
    console.warn("[quota] no service-role client — failing open (not enforcing)")
    return { allowed: true }
  }

  try {
    const month = currentMonth(now)
    const { data: row } = await admin
      .from("interview_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle()

    const used = row?.count ?? 0
    if (used >= limit) {
      return { allowed: false, reason: "quota", used, limit }
    }

    if (consume) {
      const { error } = await admin
        .from("interview_usage")
        .upsert({ user_id: userId, month, count: used + 1 })
      if (error) {
        console.error("[quota] failed to record usage:", error.message)
        // Already under limit; don't block on a write hiccup.
      }
    }

    return { allowed: true, used: used + (consume ? 1 : 0), limit }
  } catch (err) {
    console.error("[quota] check failed — failing open:", err)
    return { allowed: true }
  }
}
