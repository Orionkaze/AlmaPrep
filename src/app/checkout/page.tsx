"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import { track, EVENTS } from "@/lib/analytics"

const PLANS = {
  monthly: { id: "pro-monthly", price: 12, total: 12, per: "/ month", billed: "Billed monthly. Cancel anytime.", save: null as string | null },
  season: { id: "pro-season", price: 29, total: 29, per: "one-time", billed: "One-time charge, covers 3 months. No renewal.", save: "For one admissions season" },
  annual: { id: "pro-annual", price: 9, total: 108, per: "/ month", billed: "Billed $108 once a year.", save: "Save 25%" },
}
type Cycle = keyof typeof PLANS

function CheckoutInner() {
  const searchParams = useSearchParams()
  const requestedCycle = searchParams.get("cycle")
  const initialCycle: Cycle = requestedCycle === "season" || requestedCycle === "annual" ? requestedCycle : "monthly"
  const [cycle, setCycle] = useState<Cycle>(initialCycle)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)

  const plan = PLANS[cycle]
  const total = plan.total

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { track(EVENTS.CHECKOUT_VIEWED, { cycle: initialCycle }) }, [])

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault()
    track(EVENTS.UPGRADE_CLICKED, { cycle, plan: plan.id, amount: total })
    // ── Razorpay integration slot ────────────────────────────────────────────
    // Wire the live Razorpay checkout here: create an order server-side, then
    // open the Razorpay modal with the returned order_id. This preview simulates
    // a successful charge so the flow can be demoed end-to-end.
    setProcessing(true)
    setTimeout(() => { setProcessing(false); setPaid(true) }, 900)
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
                        Annual{cycle === "annual" && <span className="save-tag">-25%</span>}
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
                    Razorpay secure checkout mounts here
                    <div style={{ fontSize: ".78rem", marginTop: 6 }}>Cards, UPI, net-banking &amp; wallets — connected soon</div>
                  </div>

                  <button type="submit" className="btn btn-primary pay-btn btn-lg" disabled={processing}>
                    {processing ? "Processing…" : `Pay $${total} ${cycle === "annual" ? "/ year" : cycle === "season" ? "one-time" : "/ month"} →`}
                  </button>
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
                    <div className="price">${plan.price}<small>{cycle === "season" ? "" : plan.per}</small></div>
                  </div>

                  <ul className="check" style={{ margin: "20px 0" }}>
                    <li>Everything in Free</li>
                    <li><strong>Unlimited mock interviews</strong>, no monthly cap</li>
                    <li>Full progress history &amp; trend tracking</li>
                    <li>AI-powered scoring &amp; detailed feedback</li>
                  </ul>

                  <div className="summary-line"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                  {plan.save && <div className="summary-line" style={{ color: "var(--emerald-600)" }}><span>{cycle === "annual" ? "Annual discount" : "Note"}</span><span>{plan.save}</span></div>}
                  <div className="summary-line"><span>Due today</span><span>${total.toFixed(2)}</span></div>
                  <div className="summary-total">
                    <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>Total</span>
                    <strong>${total.toFixed(2)}<span style={{ fontFamily: "var(--font-body), sans-serif", fontSize: ".9rem", color: "var(--muted)", fontWeight: 400 }}> {cycle === "annual" ? "/ yr" : cycle === "season" ? "one-time" : "/ mo"}</span></strong>
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
