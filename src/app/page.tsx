import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function Home() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-bg" aria-hidden="true"></div>
          <div className="wrap">
            <span className="pill">For schools, colleges &amp; coaching institutes</span>
            <h1>Prepare every student to ace their admission interview.</h1>
            <p className="lead">Almaprep gives students realistic mock interviews drawn from thousands of vetted questions, with instant, structured feedback. No nerves on the real day.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" href="/signup">Start free for students &rarr;</Link>
              <Link className="btn btn-ghost btn-lg" href="/institutions">Book an institution demo</Link>
            </div>
            <p className="hero-note"><strong>Free forever for students.</strong> Thousands of curated questions &middot; No credit card.</p>
          </div>
        </section>

        {/* Early access */}
        <section className="section-sm">
          <div className="wrap center reveal">
            <span className="early-badge"><span className="dot"></span> Now in early access</span>
            <p className="lead narrow" style={{ marginTop: "16px" }}>A next-generation take on interview prep: a vetted question bank that's free for every student, and a live voice AI interviewer for those who want the real thing. We're onboarding our first schools and students now.</p>
          </div>
        </section>

        {/* Differentiator */}
        <section className="section tint">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">Why Almaprep is different</p>
              <h2>Real questions, reviewed by coaches. AI that's grounded in them.</h2>
              <p className="lead">Every question is written and vetted by interview coaches, so free practice is consistent, relevant, and never random. Upgrade to Pro and that same vetted foundation powers a live voice AI interviewer, conversation where it counts, grounded content underneath.</p>
            </div>
            <div className="grid grid-3">
              <div className="card reveal">
                <div className="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                </div>
                <h3>Thousands of vetted questions</h3>
                <p>HR, technical, and admissions-style questions across hundreds of programs and roles. Curated, not generated.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <h3>Instant, structured feedback</h3>
                <p>Students get a performance score plus specific, actionable suggestions the moment they finish answering.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>
                </div>
                <h3>Track progress over time</h3>
                <p>A clear history of every session so students (and counselors) can watch confidence grow week over week.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">How it works</p>
              <h2>From cold feet to confident in four steps.</h2>
            </div>
            <div className="steps narrow">
              <div className="step reveal">
                <h3>Pick a track</h3>
                <p>Choose the program or role: college admissions, scholarship panels, HR, or technical. Almaprep pulls the right question set.</p>
              </div>
              <div className="step reveal">
                <h3>Sit the mock interview</h3>
                <p>Answer realistic questions one at a time in a calm, focused environment that mirrors the real thing.</p>
              </div>
              <div className="step reveal">
                <h3>Get instant feedback</h3>
                <p>Receive a score and concrete suggestions on structure, clarity, and content while it's fresh.</p>
              </div>
              <div className="step reveal">
                <h3>Practice and improve</h3>
                <p>Come back, retry, and watch the trend line climb. Counselors can follow along for whole cohorts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Voice demo */}
        <section className="section tint">
          <div className="wrap">
            <div className="section-head center reveal">
              <span className="pill">Pro &amp; Enterprise &middot; AI voice</span>
              <h2 style={{ marginTop: "14px" }}>Sit down and actually talk to your interviewer.</h2>
              <p className="lead">No typing. You join a live meeting and speak to a voice AI interviewer that listens, replies out loud, and asks real follow-ups, then scores you on what you said.</p>
            </div>
            <div className="narrow reveal">
              <div className="callwin">
                <div className="callwin-bar">
                  <span className="rec"><b></b> REC</span>
                  <span>Mock interview &middot; Admissions track</span>
                  <span className="timer">04:12</span>
                </div>
                <div className="callwin-tiles">
                  <div className="tile active">
                    <span className="tag">AI Interviewer</span>
                    <div className="avatar ai">
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </div>
                    <div className="who" style={{ textAlign: "center" }}>Almaprep AI <span>Speaking…</span></div>
                    <div className="wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
                  </div>
                  <div className="tile">
                    <span className="tag muted">You &middot; listening</span>
                    <div className="avatar you">A</div>
                    <div className="who" style={{ textAlign: "center" }}>Alex <span>Your turn next</span></div>
                  </div>
                </div>
                <div className="callwin-cap">
                  <div className="q"><b>Follow-up question</b>You mentioned the project ran late. What would you have done differently?</div>
                </div>
                <div className="callwin-ctrl">
                  <span className="cbtn" title="Mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></span>
                  <span className="cbtn" title="Captions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h2M7 14h6M13 11h4"/></svg></span>
                  <span className="cbtn end" title="End"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg></span>
                </div>
              </div>
              <p className="center" style={{ marginTop: "16px", color: "var(--muted)", fontSize: ".9rem" }}>Illustrative preview of the Pro voice interview. <Link href="/pricing">See plans &rarr;</Link></p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="section-sm">
          <div className="wrap">
            <div className="stats narrow">
              <div className="stat reveal"><div className="num">1,000s</div><div className="lbl" style={{ color: "var(--muted)" }}>Vetted interview questions</div></div>
              <div className="stat reveal"><div className="num">$0</div><div className="lbl" style={{ color: "var(--muted)" }}>For students, forever</div></div>
              <div className="stat reveal"><div className="num">24/7</div><div className="lbl" style={{ color: "var(--muted)" }}>Practice on their schedule</div></div>
            </div>
          </div>
        </section>

        {/* Audience split */}
        <section className="section">
          <div className="wrap">
            <div className="section-head center reveal">
              <p className="eyebrow">Built for both sides of the desk</p>
              <h2>One platform. Two ways to win.</h2>
            </div>
            <div className="audience">
              <div className="card reveal">
                <span className="pill">For students</span>
                <h3 style={{ marginTop: "16px" }}>Walk in ready, not rattled</h3>
                <p>Practice as much as you want against questions real interviewers ask. Get honest feedback. Show up calm.</p>
                <ul className="check" style={{ margin: "16px 0 24px" }}>
                  <li>Free forever, no credit card</li>
                  <li>Thousands of curated questions</li>
                  <li>Instant scores and tips</li>
                  <li>Your full practice history</li>
                  <li>Go Pro for live voice AI interviews</li>
                </ul>
                <Link className="btn btn-primary" href="/signup">Start free &rarr;</Link>
              </div>
              <div className="card reveal">
                <span className="pill">For institutions</span>
                <h3 style={{ marginTop: "16px" }}>Prep every student at scale</h3>
                <p>The premium AI tier: students sit in a live meeting and actually talk to a voice AI interviewer. Plus admin dashboards, counselor analytics, and your branding.</p>
                <ul className="check" style={{ margin: "16px 0 24px" }}>
                  <li>Live voice AI interviewer</li>
                  <li>Real-time adaptive follow-ups</li>
                  <li>Admin &amp; cohort dashboards</li>
                  <li>Your logo and domain</li>
                </ul>
                <Link className="btn btn-ghost" href="/institutions">Explore for institutions &rarr;</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="section">
          <div className="wrap">
            <div className="cta-band reveal">
              <h2>Give your students the interview edge.</h2>
              <p>Students start free in under a minute. Institutions can book a walkthrough and see the admin side in action.</p>
              <div className="hero-cta">
                <Link className="btn btn-primary btn-lg" href="/signup">Start free for students</Link>
                <Link className="btn btn-light btn-lg" href="/institutions">Book an institution demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
