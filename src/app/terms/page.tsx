import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of Almaprep's interview-practice platform for students and institutions.",
  path: "/terms",
})

export default function TermsPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="section">
          <div className="wrap prose">
            <h1>Terms of Service</h1>
            <p style={{ color: "var(--muted)" }}>Last updated: 7 June 2026</p>
            <p><em>This is a placeholder for the marketing site. Replace it with your finalized, legally reviewed terms before launch.</em></p>

            <h2>Acceptance</h2>
            <p>By using Almaprep you agree to these terms. If you are using Almaprep on behalf of an institution, you agree on its behalf.</p>

            <h2>Using the service</h2>
            <p>The student tier is provided free of charge for personal interview practice. You agree to use Almaprep lawfully and not to misuse, copy, or resell the question bank or platform.</p>

            <h2>Accounts</h2>
            <p>You are responsible for keeping your account credentials secure and for activity under your account.</p>

            <h2>Institution plans</h2>
            <p>Enterprise features are provided under a separate agreement between Almaprep and the institution, which governs pricing, data handling, and support.</p>

            <h2>Disclaimer</h2>
            <p>Almaprep helps you prepare; it does not guarantee any admission, scholarship, or job outcome. The service is provided &quot;as is&quot;.</p>

            <h2>Contact</h2>
            <p>Questions about these terms? Email <a href="mailto:legal@almaprep.app">legal@almaprep.app</a>.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
