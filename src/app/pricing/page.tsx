import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import JsonLd from "@/components/JsonLd"
import { pageMetadata, faqLd } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Pricing — Free Mock Interviews, Pro & Institutions",
  description:
    "Almaprep pricing: practice free with live voice AI interviews, go Pro at $12/mo for unlimited, or roll out to your institution. No credit card to start.",
  path: "/pricing",
})

// Mirrors the visible FAQ section below (Google requires FAQ schema content to
// match what users can read on the page).
const PRICING_FAQ = [
  { q: "Is the free tier really free?", a: "Yes. The full vetted-question bank, browsing and self-study, and up to 3 full mock interviews a month cost nothing, with no credit card required. It's free forever." },
  { q: "Does Free include voice interviews?", a: "Yes. Live voice AI interviews are available on every plan, including Free, up to 3 times a month. Pro removes that monthly cap and adds full progress history and detailed feedback reports." },
  { q: "How is Enterprise different from Pro?", a: "Enterprise gives every student in your institution unlimited voice interviews, and adds the tools schools need: admin and cohort dashboards, counselor analytics, bulk management, and your own branding." },
  { q: "How is enterprise priced?", a: "Per student per year, starting around $5–$8 depending on cohort size, billed annually with a volume discount as you scale. Reach out and we'll put together a plan that fits your program." },
  { q: "Who owns student data?", a: "Your institution does. We act as a processor and never sell student data. Details live in our privacy policy." },
]

export default function PricingPage() {
  return (
    <div className="almaprep-theme">
      <JsonLd data={faqLd(PRICING_FAQ)} />
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Pricing</span>
            <h1>Start free. Go unlimited with Pro. Scale with Enterprise.</h1>
            <p className="lead narrow">Practice free, with live voice AI interviews included, up to 3 times a month. Upgrade to Pro for unlimited interviews and deeper feedback, or roll Almaprep out across your whole institution.</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="price-grid">
              <div className="price-card reveal">
                <span className="tier">Free</span>
                <div className="price">Free <small>forever</small></div>
                <p style={{ color: "var(--muted)" }}>Self-paced practice on a deterministic, vetted question bank, with live voice AI included. Consistent, reliable prep, free forever.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Thousands of vetted questions</li>
                  <li>3 mock interviews every month</li>
                  <li><strong>Live voice AI interviews</strong> you speak in</li>
                  <li>Instant scores and feedback</li>
                  <li>HR, technical &amp; admissions tracks</li>
                  <li>No credit card, ever</li>
                </ul>
                <Link className="btn btn-ghost" href="/signup">Start free &rarr;</Link>
              </div>

              <div className="price-card featured reveal">
                <span className="price-tag">Most popular</span>
                <span className="tier">Pro</span>
                <div className="price">$12 <small>/ month</small></div>
                <p style={{ color: "var(--muted)" }}>For the student who wants to practice without limits and see exactly where they stand.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Everything in Free</li>
                  <li><strong>Unlimited mock interviews</strong>, no monthly cap</li>
                  <li>Full progress history &amp; trend tracking</li>
                  <li>AI-powered scoring &amp; detailed feedback reports</li>
                  <li>Cancel anytime, or save 25% billed annually</li>
                </ul>
                <Link className="btn btn-primary" href="/checkout?plan=pro">Start Pro &rarr;</Link>
                <p style={{ marginTop: "10px", fontSize: ".82rem", color: "var(--muted)", textAlign: "center" }}>Prepping for one admissions season? <Link href="/checkout?plan=pro&cycle=season">Try the $29 season pass</Link>.</p>
              </div>

              <div className="price-card reveal">
                <span className="tier">Enterprise</span>
                <div className="price">From $5 <small>/ student / yr</small></div>
                <p style={{ color: "var(--muted)" }}>For schools, colleges, and coaching institutes preparing students at scale.</p>
                <ul className="check" style={{ marginTop: "24px" }}>
                  <li>Everything in Pro, for all your students</li>
                  <li>Admin &amp; cohort dashboards</li>
                  <li>Counselor analytics &amp; reports</li>
                  <li>Bulk student management</li>
                  <li>Your branding &amp; domain</li>
                  <li>Onboarding &amp; dedicated support</li>
                </ul>
                <Link className="btn btn-ghost" href="/contact-sales">Contact sales &rarr;</Link>
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
              <div className="card reveal"><h3>Is the free tier really free?</h3><p>Yes. The full vetted-question bank, browsing and self-study, and up to 3 full mock interviews a month cost nothing, with no credit card required. It&apos;s free forever.</p></div>
              <div className="card reveal"><h3>Does Free include voice interviews?</h3><p>Yes. Live voice AI interviews are available on every plan, including Free, up to 3 times a month. Pro removes that monthly cap and adds full progress history and detailed feedback reports.</p></div>
              <div className="card reveal"><h3>How is Enterprise different from Pro?</h3><p>Enterprise gives every student in your institution unlimited voice interviews, and adds the tools schools need: admin and cohort dashboards, counselor analytics, bulk management, and your own branding.</p></div>
              <div className="card reveal"><h3>How is enterprise priced?</h3><p>Per student per year, starting around $5&ndash;$8 depending on cohort size, billed annually with a volume discount as you scale. Reach out and we&apos;ll put together a plan that fits your program.</p></div>
              <div className="card reveal"><h3>Who owns student data?</h3><p>Your institution does. We act as a processor and never sell student data. Details live in our <Link href="/privacy">privacy policy</Link>.</p></div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
