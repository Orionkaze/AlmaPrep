import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function InstitutionsPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="pill">For schools, colleges &amp; coaching institutes</span>
            <h1>Prepare every student for the interview, at scale.</h1>
            <p className="lead narrow" style={{ marginLeft: 0 }}>The premium AI tier: every student gets live, voice-based mock interviews they actually speak in, and your counselors get the dashboards to see exactly who is ready and who needs help.</p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href="#demo">Book a demo &rarr;</a>
              <Link className="btn btn-ghost btn-lg" href="/pricing">See pricing</Link>
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section className="section">
          <div className="wrap">
            <div className="grid grid-3">
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <h3>Admin &amp; cohort dashboards</h3>
                <p>See participation, average scores, and improvement trends across classes, batches, and the whole institution from one place.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></div>
                <h3>Live voice AI interviews</h3>
                <p>The premium tier students actually speak in. They sit in a live meeting and talk to a voice AI interviewer that listens, responds, and asks real-time follow-ups, just like a real panel.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                <h3>Your brand, your domain</h3>
                <p>Run Almaprep under your institution's name and logo so it feels like part of your own program, not a third-party tool.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
                <h3>Bulk student management</h3>
                <p>Onboard hundreds of students at once with roster import, group assignments, and role-based access for staff.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                <h3>Counselor analytics</h3>
                <p>Flag at-risk students automatically, drill into individual histories, and export reports for parent and faculty reviews.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <h3>Privacy &amp; support</h3>
                <p>Student data stays yours. Get onboarding help, training for staff, and a dedicated point of contact.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rollout steps */}
        <section className="section tint">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">Rollout in days, not terms</p>
              <h2>From sign-off to students practicing, fast.</h2>
            </div>
            <div className="steps narrow">
              <div className="step reveal"><h3>Book a demo</h3><p>We walk through the admin side with your team and map it to how your program already runs.</p></div>
              <div className="step reveal"><h3>Import your students</h3><p>Upload your roster, set up cohorts, and add your branding. We handle the heavy lifting.</p></div>
              <div className="step reveal"><h3>Students start practicing</h3><p>Every student gets access immediately and can begin mock interviews the same day.</p></div>
              <div className="step reveal"><h3>Counselors track and coach</h3><p>Your team watches progress roll in and steps in exactly where it's needed.</p></div>
            </div>
          </div>
        </section>

        {/* Privacy & security */}
        <section className="section">
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">Privacy &amp; security</p>
              <h2>Built for student data, from day one.</h2>
              <p className="lead">You're trusting us with minors' data. We treat that as the responsibility it is. These are our commitments as we onboard our first institutions.</p>
            </div>
            <div className="grid grid-3">
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <h3>Your institution owns the data</h3>
                <p>Student records belong to you. We act only as a processor on your behalf, and we never sell student data or use it to train third-party models.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                <h3>Encrypted &amp; access-controlled</h3>
                <p>Data is encrypted in transit and at rest, with role-based access so staff only see the students they're responsible for.</p>
              </div>
              <div className="card reveal">
                <div className="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                <h3>Aligned to FERPA &amp; GDPR</h3>
                <p>We build to the principles behind FERPA, COPPA, and GDPR. Tell us your jurisdiction's requirements and we'll walk through how we meet them.</p>
              </div>
            </div>
            <p className="reveal" style={{ marginTop: "24px", color: "var(--muted)", fontSize: ".9rem" }}>Almaprep is in early access; formal certifications are in progress. We're happy to share specifics and a data processing agreement during your evaluation.</p>
          </div>
        </section>

        {/* Demo request form */}
        <section className="section" id="demo">
          <div className="wrap" style={{ maxWidth: "760px" }}>
            <div className="section-head center reveal">
              <p className="eyebrow">Book a demo</p>
              <h2>See the institution side in action.</h2>
              <p className="lead">Tell us about your program and we'll set up a walkthrough of the voice interviews, admin dashboards, and rollout plan.</p>
            </div>
            <form className="lead-form reveal" action="https://formspree.io/f/your-form-id" method="POST">
              <div className="row">
                <div className="field">
                  <label htmlFor="lf-name">Your name</label>
                  <input type="text" id="lf-name" name="name" required autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="lf-email">Work email</label>
                  <input type="email" id="lf-email" name="email" required autoComplete="email" />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="lf-org">Institution</label>
                  <input type="text" id="lf-org" name="institution" required autoComplete="organization" />
                </div>
                <div className="field">
                  <label htmlFor="lf-role">Your role</label>
                  <input type="text" id="lf-role" name="role" placeholder="e.g. Admissions counselor" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="lf-size">Roughly how many students?</label>
                <select id="lf-size" name="students">
                  <option value="">Select a range</option>
                  <option>Under 100</option>
                  <option>100–500</option>
                  <option>500–2,000</option>
                  <option>2,000+</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="lf-msg">Anything we should know? (optional)</label>
                <textarea id="lf-msg" name="message" placeholder="Your timeline, goals, or questions"></textarea>
              </div>
              <button className="btn btn-primary btn-lg" type="submit">Request a demo &rarr;</button>
              <p style={{ margin: "14px 0 0", color: "var(--muted)", fontSize: ".85rem", textAlign: "center" }}>Prefer email? Reach us at <a href="mailto:partnerships@almaprep.app">partnerships@almaprep.app</a>.</p>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
