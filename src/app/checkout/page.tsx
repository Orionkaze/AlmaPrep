"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import { track, EVENTS } from "@/lib/analytics"
import { startCheckout, type CheckoutState } from "@/app/actions/checkout"
import {
  PRO_BILLING_CYCLES,
  perMonthPrice,
  cycleSavingPercent,
  formatPrice,
  type BillingCycleId,
} from "@/config/plans"

type Cycle = BillingCycleId

function CheckoutInner() {
  const searchParams = useSearchParams()
  const requestedCycle = searchParams.get("cycle")
  const initialCycle: Cycle = requestedCycle === "season" || requestedCycle === "annual" ? requestedCycle : "monthly"
  const [cycle, setCycle] = useState<Cycle>(initialCycle)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [processing, setProcessing] = useState(false)
  // A hosted checkout reports success by returning to ?status=success. It is
  // never set locally — the old code flipped it after a 900ms timer with no
  // payment taken, which told people they had bought something they hadn't.
  const paid = searchParams.get("status") === "success"
  const [notice, setNotice] = useState<string | null>(null)

  const plan = PRO_BILLING_CYCLES[cycle]
  const total = plan.total
  const monthly = perMonthPrice(plan)
  const saving = cycleSavingPercent(plan)
  const annualSaving = cycleSavingPercent(PRO_BILLING_CYCLES.annual)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { track(EVENTS.CHECKOUT_VIEWED, { cycle: initialCycle }) }, [])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    track(EVENTS.UPGRADE_CLICKED, { cycle, plan: plan.sku, amount: total })
    setProcessing(true)
    setNotice(null)

    // This used to fake a successful charge — it set "You're all set" after a
    // 900ms timer, with no payment taken and no tier granted. It now goes
    // through the same server action as /upgrade, which reports honestly that
    // payments are not connected yet.
    const fd = new FormData()
    fd.set("plan", "pro")
    fd.set("cycle", plan.id)

    const state: CheckoutState = await startCheckout({ status: "idle" }, fd)
    setProcessing(false)

    if (state.status === "redirect") {
      window.location.href = state.url
      return
    }
    if (state.status === "comingSoon") {
      setNotice("Payments aren't connected yet — we'll email you the moment Pro opens up.")
      return
    }
    if (state.status === "error") {
      setNotice(state.error)
    }
  }

  return (
    <div className="almaprep-theme">
      <Header />
      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Checkout</span>
            <h1>{paid ? "You're all set." : "Upgrade to Almaprep Pro"}</h1>
            {!paid && <p className="lead narrow">Unlimited mock interviews, full progress history, and detailed AI feedback reports — no monthly cap.</p>}
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            {paid ? (
              <div className="checkout-card paid-banner" style={{ maxWidth: 560, margin: "0 auto" }}>
                <div className="tick"><i className="fa-solid fa-check" /></div>
                <h2 style={{ marginBottom: 8 }}>Welcome to Pro</h2>
                <p style={{ color: "var(--muted)", marginBottom: 24 }}>
                  This is a preview checkout — no real charge was made. Once Razorpay is connected, this is exactly where a confirmed payment lands.
                </p>
                <Link href="/dashboard" className="btn btn-primary btn-lg">Go to your dashboard &rarr;</Link>
              </div>
            ) : (
              <div className="checkout-grid">
                {/* Billing form */}
                <form className="checkout-card" onSubmit={handlePay}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                    <div className="plan-toggle" role="tablist" aria-label="Billing cycle">
                      <button type="button" className={cycle === "monthly" ? "active" : ""} onClick={() => setCycle("monthly")}>Monthly</button>
                      <button type="button" className={cycle === "season" ? "active" : ""} onClick={() => setCycle("season")}>Season</button>
                      <button type="button" className={cycle === "annual" ? "active" : ""} onClick={() => setCycle("annual")}>
                        Annual{cycle === "annual" && annualSaving !== null && (
                          <span className="save-tag">-{annualSaving}%</span>
                        )}
                      </button>
                    </div>
                  </div>
                  {cycle === "season" && (
                    <p style={{ textAlign: "center", fontSize: ".82rem", color: "var(--muted)", marginTop: -16, marginBottom: 24 }}>
                      One-time payment, covers 3 months. No auto-renewal — built for a single admissions season.
                    </p>
                  )}

                  <h3 style={{ marginBottom: 16 }}>Your details</h3>
                  <div className="field">
                    <label htmlFor="co-name">Full name</label>
                    <input id="co-name" type="text" placeholder="Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="co-email">Email</label>
                    <input id="co-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>

                  <h3 style={{ margin: "24px 0 16px" }}>Payment</h3>
                  <div className="card-mount">
                    <i className="fa-solid fa-lock" style={{ marginRight: 8 }} />
                    Secure checkout mounts here
                    <div style={{ fontSize: ".78rem", marginTop: 6 }}>Cards, UPI, net-banking &amp; wallets — not connected yet</div>
                  </div>

                  <button type="submit" className="btn btn-primary pay-btn btn-lg" disabled={processing}>
                    {processing ? "Processing…" : `Pay ${formatPrice(total)} ${cycle === "annual" ? "/ year" : cycle === "season" ? "one-time" : "/ month"} →`}
                  </button>
                  {notice && (
                    <p
                      className="auth-note"
                      role="status"
                      style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8", marginTop: 12 }}
                    >
                      {notice}
                    </p>
                  )}
                  <p className="secure-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Encrypted checkout · you can cancel anytime
                  </p>
                </form>

                {/* Order summary */}
                <aside className="summary-card">
                  <h3 style={{ marginBottom: 16 }}>Order summary</h3>
                  <div className="summary-plan">
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>Almaprep Pro</div>
                      <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>{cycle === "annual" ? "Annual plan" : cycle === "season" ? "3-month season pass" : "Monthly plan"}</div>
                    </div>
                    <div className="price">{formatPrice(monthly)}<small>{cycle === "season" ? "" : " / month"}</small></div>
                  </div>

                  <ul className="check" style={{ margin: "20px 0" }}>
                    <li>Everything in Free</li>
                    <li><strong>Unlimited mock interviews</strong>, no monthly cap</li>
                    <li>Full progress history &amp; trend tracking</li>
                    <li>AI-powered scoring &amp; detailed feedback</li>
                  </ul>

                  <div className="summary-line"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
                  {saving !== null && <div className="summary-line" style={{ color: "var(--emerald-600)" }}><span>Discount</span><span>Save {saving}%</span></div>}
                  {saving === null && plan.note && <div className="summary-line" style={{ color: "var(--emerald-600)" }}><span>Note</span><span>{plan.note}</span></div>}
                  <div className="summary-line"><span>Due today</span><span>{formatPrice(total)}</span></div>
                  <div className="summary-total">
                    <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>Total</span>
                    <strong>{formatPrice(total)}<span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: ".9rem", color: "var(--muted)", fontWeight: 400 }}> {cycle === "annual" ? "/ yr" : cycle === "season" ? "one-time" : "/ mo"}</span></strong>
                  </div>

                  <p style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: 16 }}>{plan.billed}</p>
                  <p style={{ marginTop: 12, fontSize: ".85rem" }}>
                    Buying for a school?{" "}
                    <Link href="/institutions">See institution plans</Link>
                  </p>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="almaprep-theme" style={{ minHeight: "60vh" }} />}>
      <CheckoutInner />
    </Suspense>
  )
}
