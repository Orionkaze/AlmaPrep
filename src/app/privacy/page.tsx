import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

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
            <p>Almaprep ("we", "us") provides an interview-practice platform for students and institutions. This policy explains what we collect and how we use it.</p>

            <h2>What we collect</h2>
            <ul>
              <li><strong>Account information</strong> such as name and email.</li>
              <li><strong>Practice data</strong> such as your answers, scores, and session history.</li>
              <li><strong>Usage data</strong> such as device and basic analytics to improve the product.</li>
            </ul>

            <h2>How we use it</h2>
            <p>We use your data to provide mock interviews, generate feedback, track progress, and improve Almaprep. For institution accounts, relevant data is made available to authorized staff at your institution.</p>

            <h2>Student data and institutions</h2>
            <p>When an institution deploys Almaprep, the institution is the owner of its students' data and we act as a processor on its behalf. We do not sell student data.</p>

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
