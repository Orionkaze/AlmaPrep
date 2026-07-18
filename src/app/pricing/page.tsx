import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import { PLANS, formatPrice, formatInr, type Plan } from "@/config/plans"

function PriceLabel({ plan }: { plan: Plan }) {
  if (plan.price === 0) {
    return (
      <div className="price">
        Free <small>forever</small>
      </div>
    )
  }
  if (plan.price === null) {
    return <div className="price">Custom</div>
  }
  return (
    <>
      <div className="price">
        {formatPrice(plan.price)}{" "}
        {plan.period && <small>/ {plan.period}</small>}
      </div>
      {plan.priceInr != null && (
        <div style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: "-8px" }}>
          or {formatInr(plan.priceInr)} / {plan.period} in India
        </div>
      )}
    </>
  )
}

export default function PricingPage() {
  const order: Plan[] = [PLANS.free, PLANS.pro, PLANS.enterprise]

  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Pricing</span>
            <h1>Start free. Upgrade when you need more.</h1>
            <p className="lead narrow">
              Practice free on the question bank with real AI feedback. Upgrade
              for unlimited interviews, or roll Almaprep out across your whole
              institution.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="price-grid">
              {order.map((plan) => (
                <div
                  key={plan.id}
                  className={`price-card reveal${plan.featured ? " featured" : ""}`}
                >
                  {plan.featured && <span className="price-tag">Most popular</span>}
                  <span className="tier">{plan.name}</span>
                  <PriceLabel plan={plan} />
                  <p style={{ color: "var(--muted)" }}>{plan.blurb}</p>
                  <ul className="check" style={{ marginTop: "24px" }}>
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {plan.cta.href.startsWith("/") ? (
                    <Link className={`btn ${plan.cta.variant}`} href={plan.cta.href}>
                      {plan.cta.label} &rarr;
                    </Link>
                  ) : (
                    <a className={`btn ${plan.cta.variant}`} href={plan.cta.href}>
                      {plan.cta.label} &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p
              className="center"
              style={{ marginTop: "32px", color: "var(--muted)" }}
            >
              Questions about volume, data, or rollout?{" "}
              <Link href="/institutions">See the institutions page</Link> or{" "}
              <Link href="/contact?plan=enterprise">contact sales</Link>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="section tint">
          <div className="wrap narrow">
            <div className="section-head center reveal">
              <p className="eyebrow">FAQ</p>
              <h2>Common questions</h2>
            </div>
            <div className="grid" style={{ gap: "16px" }}>
              <div className="card reveal">
                <h3>Is the free tier really free?</h3>
                <p>
                  Yes. You get the full vetted-question experience, AI scoring
                  and feedback, resume analysis and the coding simulator, with no
                  credit card required. Free interviews are capped each month.
                </p>
              </div>
              <div className="card reveal">
                <h3>What does Pro add?</h3>
                <p>
                  Pro removes the monthly cap so you can run unlimited AI mock
                  interviews, and adds resume-tailored and GitHub repo-based
                  interviews plus priority support.
                </p>
              </div>
              <div className="card reveal">
                <h3>How is Enterprise different from Pro?</h3>
                <p>
                  Enterprise gives every student in your institution the full
                  experience, with volume pricing, onboarding and dedicated
                  support, and a rollout planned with your team.
                </p>
              </div>
              <div className="card reveal">
                <h3>How is Enterprise priced?</h3>
                <p>
                  Pricing scales with the number of students and the features you
                  need. Reach out and we&apos;ll put together a plan that fits your
                  program.
                </p>
              </div>
              <div className="card reveal">
                <h3>Who owns student data?</h3>
                <p>
                  Your institution does. We act as a processor and never sell
                  student data. Details live in our{" "}
                  <Link href="/privacy">privacy policy</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
