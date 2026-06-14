import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function MockInterviewsForSchoolsPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <article className="section">
          <div className="wrap prose">
            <p className="eyebrow"><Link href="/blog">&larr; Blog</Link> &middot; For counselors</p>
            <h1>Running mock interviews across a whole cohort</h1>
            <p className="lead">A single counselor can only sit across from so many students. Here's how prep programs use Almaprep to give every student real practice, then spend their own time where it matters most.</p>

            <h2>The problem with one-on-one only</h2>
            <p>Traditional mock interviews don't scale. If you have two hundred students and a few weeks, most of them get one practice run, if any. The students who need the most help are often the ones who never get on the calendar.</p>

            <h2>A blended approach</h2>
            <p>The programs that get the best results use Almaprep for volume and reserve human time for depth:</p>
            <ul>
              <li><strong>Every student practices first.</strong> Students run unlimited mock interviews on their own time and arrive already warmed up.</li>
              <li><strong>Dashboards surface who needs help.</strong> Counselors see participation and scores by cohort, so support goes where it's needed.</li>
              <li><strong>Human sessions go further.</strong> When you do sit down with a student, you're refining, not starting from zero.</li>
            </ul>

            <blockquote>The goal isn't to replace the counselor. It's to make sure no student walks in cold, and to give counselors a map of where to spend their hours.</blockquote>

            <h2>What rollout looks like</h2>
            <ol>
              <li>Import your roster and set up cohorts.</li>
              <li>Students start practicing the same day.</li>
              <li>Watch the dashboards and flag students who haven't started or are scoring low.</li>
              <li>Book targeted human sessions with the students the data highlights.</li>
            </ol>

            <p>The enterprise tier adds live voice AI interviews students actually speak in, counselor analytics, and your own branding on top of the free student experience.</p>
            <p><Link className="btn btn-primary" href="/institutions">See Almaprep for institutions &rarr;</Link></p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
