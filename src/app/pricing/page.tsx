import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function PricingPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Pricing</span>
            <h1>Start free. Go Pro for voice. Scale with Enterprise.</h1>
            <p className="lead narrow">Practice free on the question bank forever. Upgrade to Pro for live voice AI interviews, or roll Almaprep out across your whole institution.</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="price-grid">
              <div className="price-card reveal">
                <span className="tier">Free</span>
                <div className="price">Free <small>forever</small></div>
                <p style={{ color: "var(--muted)" }}>Self-paced practice on a deterministic, vetted question bank. Consistent, reliable prep, free forever.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Thousands of vetted questions</li>
                  <li>Unlimited mock interviews</li>
                  <li>Instant scores and feedback</li>
                  <li>Full progress history</li>
                  <li>HR, technical &amp; admissions tracks</li>
                  <li>No credit card, ever</li>
                </ul>
                <Link className="btn btn-ghost" href="/signup">Start free &rarr;</Link>
              </div>

              <div className="price-card featured reveal">
                <span className="price-tag">Most popular</span>
                <span className="tier">Pro</span>
                <div className="price">$12 <small>/ month</small></div>
                <p style={{ color: "var(--muted)" }}>For the individual student who wants the real thing: a live voice interview with an AI interviewer.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Everything in Free</li>
                  <li><strong>Live voice AI interviews</strong> you speak in</li>
                  <li>Real-time adaptive AI follow-ups</li>
                  <li>AI-powered scoring &amp; detailed feedback</li>
                  <li>Cancel anytime</li>
                </ul>
                <Link className="btn btn-primary" href="/signup">Start Pro &rarr;</Link>
              </div>

              <div className="price-card reveal">
                <span className="tier">Enterprise</span>
                <div className="price">Custom</div>
                <p style={{ color: "var(--muted)" }}>For schools, colleges, and coaching institutes preparing students at scale.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Everything in Pro, for all your students</li>
                  <li>Admin &amp; cohort dashboards</li>
                  <li>Counselor analytics &amp; reports</li>
                  <li>Bulk student management</li>
                  <li>Your branding &amp; domain</li>
                  <li>Onboarding &amp; dedicated support</li>
                </ul>
                <a className="btn btn-ghost" href="mailto:partnerships@almaprep.app?subject=Mock%20Mate%20Enterprise">Contact sales &rarr;</a>
              </div>
            </div>
            <p className="center" style={{ marginTop: "32px", color: "var(--muted)" }}>Questions about volume, data, or rollout? <Link href="/institutions">See the institutions page</Link> or email <a href="mailto:partnerships@almaprep.app">partnerships@almaprep.app</a>.</p>
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
              <div className="card reveal"><h3>Is the free tier really free?</h3><p>Yes. The full vetted-question experience, unlimited practice, and feedback cost nothing, with no credit card required. It's free forever.</p></div>
              <div className="card reveal"><h3>What does Pro add?</h3><p>Pro unlocks the live voice AI interview: you join a meeting and actually speak to an AI interviewer that listens, responds aloud, and asks real-time follow-ups, plus AI-powered scoring. It's the closest thing to the real room.</p></div>
              <div className="card reveal"><h3>How is Enterprise different from Pro?</h3><p>Enterprise gives every student in your institution the Pro voice experience, and adds the tools schools need: admin and cohort dashboards, counselor analytics, bulk management, and your own branding.</p></div>
              <div className="card reveal"><h3>How is enterprise priced?</h3><p>Pricing scales with the number of students and the features you need. Reach out and we'll put together a plan that fits your program.</p></div>
              <div className="card reveal"><h3>Who owns student data?</h3><p>Your institution does. We act as a processor and never sell student data. Details live in our <Link href="/privacy">privacy policy</Link>.</p></div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
