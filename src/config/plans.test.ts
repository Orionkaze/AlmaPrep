import { describe, it, expect } from "vitest"
import {
  PLANS,
  PRO_BILLING_CYCLES,
  perMonthPrice,
  cycleSavingPercent,
} from "./plans"

describe("Pro billing cycles", () => {
  // The checkout page used to carry its own price table with a $12 monthly
  // price while /pricing advertised PLANS.pro.price. Whatever the number is,
  // the two must be the same one.
  it("charges the advertised monthly price", () => {
    expect(PRO_BILLING_CYCLES.monthly.total).toBe(PLANS.pro.price)
  })

  it("prices multi-month cycles below the monthly rate", () => {
    for (const cycle of [PRO_BILLING_CYCLES.season, PRO_BILLING_CYCLES.annual]) {
      expect(perMonthPrice(cycle)).toBeLessThan(PLANS.pro.price!)
    }
  })

  it("reports no saving for the monthly cycle", () => {
    expect(cycleSavingPercent(PRO_BILLING_CYCLES.monthly)).toBeNull()
  })

  // The old UI hardcoded "Save 25%", computed against a price that no longer
  // existed. Deriving it means the badge cannot go stale.
  it("derives the saving from the prices themselves", () => {
    const annual = PRO_BILLING_CYCLES.annual
    const saving = cycleSavingPercent(annual)
    const expected = Math.round(
      ((PLANS.pro.price! * annual.months - annual.total) / (PLANS.pro.price! * annual.months)) * 100
    )
    expect(saving).toBe(expected)
  })

  it("gives every cycle a distinct sku for the payment provider", () => {
    const skus = Object.values(PRO_BILLING_CYCLES).map((c) => c.sku)
    expect(new Set(skus).size).toBe(skus.length)
  })
})
