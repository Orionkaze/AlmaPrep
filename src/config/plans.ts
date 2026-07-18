/**
 * Plan / tier configuration — the single source of truth for pricing.
 *
 * OWNER: this is the only file to touch to change prices, the free-tier limit,
 * or what each tier unlocks. Nothing else hardcodes a price or a limit.
 *
 * NOTE(owner): currency is USD. The product's question bank is built for
 * UK-style university admissions (A-level / GCSE framing), so the buyer market
 * is unconfirmed — dollars are the neutral default until you confirm who pays.
 * If the audience is UK-domestic, switch CURRENCY to GBP; if rupee-paying
 * students applying abroad, switch to INR. It is a one-line change here.
 */

export type TierId = "free" | "pro" | "enterprise"

export const TIER_IDS = ["free", "pro", "enterprise"] as const

export const DEFAULT_TIER: TierId = "free"

export const CURRENCY = {
  code: "USD",
  symbol: "$",
  locale: "en-US",
} as const

export type Entitlements = {
  /** Number of NEW interviews allowed per calendar month, or "unlimited". */
  monthlyInterviews: number | "unlimited"
  resumeAnalysis: boolean
  githubAnalysis: boolean
  codingChallenges: boolean
  personas: boolean
  /**
   * Live voice AI interviews.
   *
   * Typed as the literal `false`, not `boolean`, on purpose: no voice feature
   * exists in this codebase yet. The literal type makes every `if (ent.voice)`
   * provably dead today, and widening this to `boolean` when voice ships will
   * surface every call site through the compiler instead of silently enabling a
   * half-built path.
   */
  voice: false
  adminDashboard: boolean
  prioritySupport: boolean
}

/** Keys of Entitlements whose value is a plain boolean (i.e. gate-able today). */
export type BooleanEntitlementKey = {
  [K in keyof Entitlements]: Entitlements[K] extends boolean ? K : never
}[keyof Entitlements]

export type Plan = {
  id: TierId
  name: string
  /** Monthly price in USD (the canonical price). `null` means "Custom" or unpriced. */
  price: number | null
  /** Monthly price in INR, shown alongside USD on marketing pages. Optional. */
  priceInr?: number | null
  period: "month" | null
  blurb: string
  /**
   * Marketing bullets. Every line here MUST describe something that exists in
   * this codebase today. (The old page sold voice interviews that do not exist.)
   */
  features: string[]
  cta: { label: string; href: string; variant: "btn-primary" | "btn-ghost" }
  featured?: boolean
  /** Reserved for a future Razorpay integration. Unused today. */
  razorpayPlanId?: string
  entitlements: Entitlements
}

export const PLANS: Record<TierId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    period: null,
    blurb:
      "Self-paced practice on a vetted question bank, with real AI feedback on every answer.",
    features: [
      "Thousands of vetted questions across 20+ programs",
      "3 AI mock interviews every month",
      "Instant AI scoring and detailed feedback",
      "Resume upload and AI analysis",
      "Coding challenge simulator",
      "Full progress history, streaks and badges",
      "No credit card, ever",
    ],
    cta: { label: "Start free", href: "/signup", variant: "btn-ghost" },
    entitlements: {
      monthlyInterviews: 3,
      resumeAnalysis: true,
      githubAnalysis: true,
      codingChallenges: true,
      personas: true,
      voice: false,
      adminDashboard: false,
      prioritySupport: false,
    },
  },

  pro: {
    id: "pro",
    name: "Pro",
    // Global-friendly pricing. $9.99 USD is the canonical price; ₹999 is the
    // India marketing price (a local anchor, not a conversion). Both are shown
    // on the marketing pages.
    price: 9.99,
    priceInr: 999,
    period: "month",
    blurb:
      "For students preparing seriously, with as much practice as you need before the real thing.",
    features: [
      "Everything in Free",
      "Unlimited AI mock interviews",
      "Resume-tailored interview questions",
      "GitHub repo-based technical interviews",
      "Priority support",
    ],
    cta: { label: "Upgrade to Pro", href: "/upgrade", variant: "btn-primary" },
    featured: true,
    entitlements: {
      monthlyInterviews: "unlimited",
      resumeAnalysis: true,
      githubAnalysis: true,
      codingChallenges: true,
      personas: true,
      voice: false,
      adminDashboard: false,
      prioritySupport: true,
    },
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    period: null,
    blurb:
      "For schools, colleges and coaching institutes preparing students at scale.",
    features: [
      "Everything in Pro, for every student",
      "Volume pricing per student",
      "Onboarding and dedicated support",
      "Rollout planning with your team",
    ],
    cta: {
      label: "Contact sales",
      href: "/contact?plan=enterprise",
      variant: "btn-ghost",
    },
    entitlements: {
      monthlyInterviews: "unlimited",
      resumeAnalysis: true,
      githubAnalysis: true,
      codingChallenges: true,
      personas: true,
      voice: false,
      adminDashboard: false,
      prioritySupport: true,
    },
  },
}

/** Sales contact address. Sourced here so there is one place to change it. */
export const SALES_EMAIL = process.env.SALES_EMAIL_TO || "partnerships@almaprep.app"

/**
 * Master switch for paywall ENFORCEMENT (blocking free users at their limit).
 * OFF by default so nothing changes for existing users. The owner turns this on
 * (PAYWALL_ENABLED=true) only after the leads/tier SQL is run and the service
 * role key is set — otherwise the limit cannot be enforced safely anyway.
 *
 * NOTE: this gates enforcement only. The upgrade PAGE and prompts are always
 * visible; they just don't block anyone until this is true.
 */
export function isPaywallEnabled(): boolean {
  return process.env.PAYWALL_ENABLED === "true"
}

/**
 * Format a monthly price for display.
 * `null` → "Custom"; `0` → "Free". Never renders a fake number.
 */
export function formatPrice(price: number | null): string {
  if (price === null) return "Custom"
  if (price === 0) return "Free"
  return new Intl.NumberFormat(CURRENCY.locale, {
    style: "currency",
    currency: CURRENCY.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

/** Format an INR amount for the marketing display, e.g. 999 -> "₹999". */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}
