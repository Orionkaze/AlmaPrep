import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import UpgradeButton from "@/components/almaprep/UpgradeButton"
import { PLANS, formatPrice, formatInr } from "@/config/plans"

export default function UpgradePage() {
  const pro = PLANS.pro

  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Upgrade</span>
            <h1>Go Pro for unlimited practice.</h1>
            <p className="lead narrow">
              Remove the monthly cap and prepare as much as you need, with
              resume-tailored and repo-based interviews.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="wrap" style={{ maxWidth: "560px" }}>
            <div className="price-card featured reveal">
              <span className="tier">{pro.name}</span>
              <div className="price">
                {formatPrice(pro.price)}{" "}
                {pro.period && <small>/ {pro.period}</small>}
              </div>
              {pro.priceInr != null && (
                <div style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: "-8px" }}>
                  or {formatInr(pro.priceInr)} / {pro.period} in India
                </div>
              )}
              <p style={{ color: "var(--muted)" }}>{pro.blurb}</p>
              <ul className="check" style={{ marginTop: "24px" }}>
                {pro.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div style={{ marginTop: "24px" }}>
                <UpgradeButton plan="pro" />
              </div>
            </div>
            <p
              className="center"
              style={{ marginTop: "24px", color: "var(--muted)" }}
            >
              Need this for a whole institution?{" "}
              <Link href="/contact?plan=enterprise">Talk to sales</Link>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
