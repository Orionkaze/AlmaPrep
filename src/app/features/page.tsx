import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function FeaturesPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="pill">Features</span>
            <h1>Everything a student needs to walk in ready.</h1>
            <p className="lead narrow" style={{ marginLeft: 0 }}>Realistic practice, honest feedback, and a clear view of progress. Free for students, with an adaptive AI layer for institutions.</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            {/* Feature 1 */}
            <div className="feature-row reveal">
              <div>
                <p className="eyebrow">Vetted question bank</p>
                <h2>Thousands of real questions, curated by coaches.</h2>
                <p>The free experience runs on a deterministic bank of vetted questions, so every student gets the same fair, high-quality practice. No AI guesswork, no off-topic detours, no made-up prompts.</p>
                <ul className="check" style={{ marginTop: "16px" }}>
                  <li>HR, technical, and admissions tracks</li>
                  <li>Hundreds of programs and roles</li>
                  <li>Reviewed by interview coaches</li>
                </ul>
              </div>
              <div className="feature-media">
                <span className="pill">Question 7 of 12</span>
                <h3 style={{ margin: "16px 0 8px" }}>&ldquo;Tell me about a time you led a team through a setback.&rdquo;</h3>
                <p style={{ color: "var(--muted)", margin: 0 }}>Admissions &middot; Behavioral &middot; Medium difficulty</p>
                <div style={{ marginTop: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span className="pill">Leadership</span><span className="pill">Resilience</span><span className="pill">STAR method</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="feature-row flip reveal">
              <div>
                <p className="eyebrow">Instant feedback</p>
                <h2>A score and real suggestions, the moment you finish.</h2>
                <p>Almaprep evaluates each answer for structure, clarity, and content, then hands back a score with specific things to fix, while the answer is still fresh in the student's mind.</p>
                <ul className="check" style={{ marginTop: "16px" }}>
                  <li>Performance score per answer</li>
                  <li>Actionable, specific suggestions</li>
                  <li>Tips on structure and delivery</li>
                </ul>
              </div>
              <div className="feature-media">
                <p style={{ margin: "0 0 6px", color: "var(--muted)" }}>Your score</p>
                <div style={{ fontFamily: "var(--font-head)", fontSize: "3rem", color: "var(--emerald-600)", lineHeight: 1 }}>82<span style={{ fontSize: "1.2rem", color: "var(--muted)" }}>/100</span></div>
                <ul className="check" style={{ marginTop: "20px" }}>
                  <li>Strong opening and clear structure</li>
                  <li>Add a concrete result to your example</li>
                  <li>Slow down on the closing sentence</li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="feature-row reveal">
              <div>
                <p className="eyebrow">Progress tracking</p>
                <h2>Watch confidence climb, session by session.</h2>
                <p>Every mock interview is saved. Students see their history and trend line; institutions see the same for entire cohorts, so it's obvious who is improving and who needs a hand.</p>
                <ul className="check" style={{ marginTop: "16px" }}>
                  <li>Full session history</li>
                  <li>Trends over time</li>
                  <li>Cohort views for counselors</li>
                </ul>
              </div>
              <div className="feature-media">
                <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>Last 6 sessions</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "120px" }}>
                  <div style={{ flex: 1, background: "var(--emerald-200)", height: "42%", borderRadius: "6px" }}></div>
                  <div style={{ flex: 1, background: "var(--emerald-200)", height: "55%", borderRadius: "6px" }}></div>
                  <div style={{ flex: 1, background: "var(--emerald-400)", height: "60%", borderRadius: "6px" }}></div>
                  <div style={{ flex: 1, background: "var(--emerald-400)", height: "72%", borderRadius: "6px" }}></div>
                  <div style={{ flex: 1, background: "var(--emerald)", height: "80%", borderRadius: "6px" }}></div>
                  <div style={{ flex: 1, background: "var(--emerald)", height: "92%", borderRadius: "6px" }}></div>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="feature-row flip reveal">
              <div>
                <span className="pill">Pro &amp; Enterprise &middot; AI voice</span>
                <h2 style={{ marginTop: "16px" }}>Live voice interviews with an AI interviewer.</h2>
                <p>The premium, AI-powered experience. You join a live meeting and speak to a voice AI interviewer that listens, responds out loud, and asks intelligent follow-ups in real time, just like sitting across from a real panel. Available on <strong>Pro</strong> for individuals and <strong>Enterprise</strong> for whole institutions.</p>
                <ul className="check" style={{ marginTop: "16px" }}>
                  <li>Spoken, real-time conversation</li>
                  <li>Dynamic follow-ups based on what you say</li>
                  <li>Feels like the real interview room</li>
                </ul>
                <div className="hero-cta" style={{ marginTop: "24px" }}>
                  <Link className="btn btn-primary" href="/pricing">See plans &rarr;</Link>
                  <Link className="btn btn-ghost" href="/institutions">For institutions</Link>
                </div>
              </div>
              <div className="feature-media">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <span style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--emerald)", display: "grid", placeItems: "center", flex: "none" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>AI Interviewer</p>
                    <p style={{ margin: 0, color: "var(--emerald-600)", fontSize: ".82rem" }}>● Speaking &middot; live</p>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: "3px", height: "24px" }} aria-hidden="true">
                    <span style={{ width: "3px", height: "40%", background: "var(--emerald-400)", borderRadius: "2px" }}></span>
                    <span style={{ width: "3px", height: "90%", background: "var(--emerald)", borderRadius: "2px" }}></span>
                    <span style={{ width: "3px", height: "60%", background: "var(--emerald-400)", borderRadius: "2px" }}></span>
                    <span style={{ width: "3px", height: "100%", background: "var(--emerald)", borderRadius: "2px" }}></span>
                    <span style={{ width: "3px", height: "50%", background: "var(--emerald-400)", borderRadius: "2px" }}></span>
                  </div>
                </div>
                <h3 style={{ margin: "0 0 8px" }}>&ldquo;You mentioned the project ran late. What would you do differently next time?&rdquo;</h3>
                <p style={{ color: "var(--muted)", margin: 0, fontSize: ".92rem" }}>Spoken aloud, generated live from the student's last answer &middot; Enterprise only</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section tint">
          <div className="wrap">
            <div className="cta-band reveal">
              <h2>Try it free, today.</h2>
              <p>Students get the full vetted-question experience at no cost. Institutions can add the adaptive layer and admin tools.</p>
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
