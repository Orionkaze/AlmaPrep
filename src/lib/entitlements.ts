import {
  PLANS,
  DEFAULT_TIER,
  type TierId,
  type Entitlements,
  type BooleanEntitlementKey,
} from "@/config/plans"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { createClient } from "@/lib/supabase/server"

/**
 * Tier for demo/mock sessions. Deliberately "free": the demo cookie is
 * unsigned and settable from any browser console, so it must NOT confer a paid
 * tier once gating is real. (The legacy code set "premium" here, which was a
 * no-op only because nothing read the tier — see normalizeTier below.)
 */
export const DEMO_TIER: TierId = "free"

/**
 * Map any stored/legacy tier string to a known TierId. Fails closed.
 *
 * - "premium" (written by demo mode) → "pro"
 * - unknown / null / garbage → "free"
 *
 * The subscription_tier column has no DB constraint yet, so it can hold
 * anything; never cast a raw string to TierId without going through here.
 */
export function normalizeTier(raw: string | null | undefined): TierId {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "pro":
    case "premium":
      return "pro"
    case "enterprise":
      return "enterprise"
    case "free":
      return "free"
    default:
      return DEFAULT_TIER
  }
}

export function getEntitlements(tier: TierId): Entitlements {
  return PLANS[tier].entitlements
}

export function canUseFeature(
  ent: Entitlements,
  key: BooleanEntitlementKey
): boolean {
  return ent[key] === true
}

/**
 * THE single tier read. Replaces the copies duplicated across the interview,
 * resume and profile code. Never throws — returns "free" on any failure.
 */
export async function getUserTier(): Promise<{
  tier: TierId
  userId: string | null
  isDemo: boolean
}> {
  const { userId, isDemo } = await getCurrentUser()

  if (isDemo) {
    return { tier: DEMO_TIER, userId, isDemo: true }
  }
  if (!userId) {
    return { tier: DEFAULT_TIER, userId: null, isDemo: false }
  }

  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", userId)
      .single()
    return {
      tier: normalizeTier(profile?.subscription_tier),
      userId,
      isDemo: false,
    }
  } catch (err) {
    console.error("[getUserTier] Failed to read subscription_tier:", err)
    return { tier: DEFAULT_TIER, userId, isDemo: false }
  }
}
