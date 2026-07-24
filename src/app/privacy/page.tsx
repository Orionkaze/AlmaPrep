import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Almaprep collects, uses, and protects your data — including student and children's data for institutions. We never sell student data.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="section">
          <div className="wrap prose">
            <h1>Privacy Policy</h1>
            <p style={{ color: "var(--muted)" }}>Last updated: 7 June 2026</p>
            <p><em>This is a placeholder policy for the marketing site. Replace it with your finalized, legally reviewed policy before launch.</em></p>

            <h2>Who we are</h2>
            <p>Almaprep (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an interview-practice platform for students and institutions. This policy explains what we collect and how we use it.</p>

            <h2>What we collect</h2>
            <ul>
              <li><strong>Account information</strong> such as name and email.</li>
              <li><strong>Practice data</strong> such as your answers, scores, and session history.</li>
              <li><strong>Usage data</strong> such as device and basic analytics to improve the product.</li>
            </ul>

            <h2>How we use it</h2>
            <p>We use your data to provide mock interviews, generate feedback, track progress, and improve Almaprep. For institution accounts, relevant data is made available to authorized staff at your institution.</p>

            <h2>Student data and institutions</h2>
            <p>When an institution deploys Almaprep, the institution is the owner of its students&apos; data and we act as a processor on its behalf. We do not sell student data, and we do not use it to train third-party models.</p>

            <h2>Children&apos;s privacy</h2>
            <p>Almaprep is intended for use by students, including minors, primarily through their school or institution. For students under 13, we rely on the institution or a parent/guardian to provide the appropriate consent before an account is created, consistent with the principles of COPPA and applicable local law. We collect only the data needed to provide interview practice and feedback. If you believe a child has created an account without the required consent, contact us at <a href="mailto:privacy@almaprep.app">privacy@almaprep.app</a> and we will delete it.</p>

            <h2>Your choices</h2>
            <p>You can request access to or deletion of your personal data by contacting us. Institution users should also contact their administrator.</p>

            <h2>Contact</h2>
            <p>Questions about privacy? Email <a href="mailto:privacy@almaprep.app">privacy@almaprep.app</a>.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
