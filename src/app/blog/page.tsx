import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Interview Prep Blog — Tips, Questions & Guides",
  description:
    "Practical interview-prep advice for students and schools: common admission questions, beating nerves, and running mock interviews across a whole cohort.",
  path: "/blog",
})

export default function BlogIndexPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="pill">Blog</span>
            <h1>Interview prep, explained simply.</h1>
            <p className="lead narrow" style={{ marginLeft: 0 }}>Practical guides for students getting ready and counselors helping them.</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="grid grid-3">
              <Link className="card reveal" href="/blog/admission-interview-questions" style={{ color: "inherit" }}>
                <span className="pill">For students</span>
                <h3 style={{ marginTop: "16px" }}>10 college admission interview questions (and how to answer them)</h3>
                <p style={{ color: "var(--muted)" }}>The questions that come up again and again, with a simple framework for each.</p>
                <span style={{ color: "var(--emerald-600)", fontWeight: 600 }}>Read &rarr;</span>
              </Link>
              <Link className="card reveal" href="/blog/beat-interview-nerves" style={{ color: "inherit" }}>
                <span className="pill">For students</span>
                <h3 style={{ marginTop: "16px" }}>How to beat interview nerves before the big day</h3>
                <p style={{ color: "var(--muted)" }}>Why nerves happen, and the practice habit that quiets them.</p>
                <span style={{ color: "var(--emerald-600)", fontWeight: 600 }}>Read &rarr;</span>
              </Link>
              <Link className="card reveal" href="/blog/mock-interviews-for-schools" style={{ color: "inherit" }}>
                <span className="pill">For counselors</span>
                <h3 style={{ marginTop: "16px" }}>Running mock interviews across a whole cohort</h3>
                <p style={{ color: "var(--muted)" }}>How counselors use Almaprep to prepare every student, not just a few.</p>
                <span style={{ color: "var(--emerald-600)", fontWeight: 600 }}>Read &rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
