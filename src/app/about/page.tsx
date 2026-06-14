import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function AboutPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="pill">About</span>
            <h1>Great interview prep, for every student.</h1>
            <p className="lead narrow" style={{ marginLeft: 0 }}>The students who walk into admission interviews most confident are usually the ones who could afford to practice with a coach. We think that edge should belong to everyone.</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap prose reveal">
            <h2>Why we built Almaprep</h2>
            <p>Interviews decide a lot. A seat at a college, a scholarship, a first job. Yet most students get almost no chance to practice before the moment that counts. The few who do are often the ones with access to private coaching.</p>
            <p>We started Almaprep to close that gap. Instead of locking quality practice behind a paywall, we built a deterministic engine on top of thousands of vetted interview questions, and we gave it away free to students. No subscriptions, no gimmicks, no AI making things up.</p>

            <h2>How we think about it</h2>
            <blockquote>Practice should be consistent, fair, and available at 2am the night before. That is what a question bank does that a chatbot cannot guarantee.</blockquote>
            <p>For students who want the real thing, and for schools preparing whole cohorts, we layer on live voice AI interviews and the dashboards counselors need, so an entire program can lift its students at once.</p>

            <h2>What we care about</h2>
            <ul>
              <li><strong>Access.</strong> The student tier is free, and it stays free.</li>
              <li><strong>Trust.</strong> Vetted questions, transparent feedback, and student data that belongs to students and their schools.</li>
              <li><strong>Outcomes.</strong> We measure ourselves by whether students walk in calmer and walk out further along.</li>
            </ul>
          </div>
        </section>

        <section className="section tint">
          <div className="wrap">
            <div className="cta-band reveal">
              <h2>Join us.</h2>
              <p>Whether you're a student or an institution, getting started takes minutes.</p>
              <div className="hero-cta">
                <Link className="btn btn-primary btn-lg" href="/signup">Start free</Link>
                <Link className="btn btn-light btn-lg" href="/institutions">For institutions</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
