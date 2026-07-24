import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import JsonLd from "@/components/JsonLd"
import { pageMetadata, blogPostingLd, breadcrumbLd } from "@/lib/seo"

const PATH = "/blog/beat-interview-nerves"
const TITLE = "How to Beat Interview Nerves Before the Big Day"
const DESC =
  "Interview nerves aren't a character flaw — they're your body reacting to the unfamiliar. Practical ways to make the interview feel familiar so nerves stop hijacking you."
const PUBLISHED = "2026-06-18"

export const metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH, type: "article" })

export default function BeatNervesPage() {
  return (
    <div className="almaprep-theme">
      <JsonLd data={blogPostingLd({ headline: TITLE, description: DESC, path: PATH, datePublished: PUBLISHED })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: TITLE, path: PATH }])} />
      <RevealOnScroll />
      <Header />

      <main>
        <article className="section">
          <div className="wrap prose">
            <p className="eyebrow"><Link href="/blog">&larr; Blog</Link> &middot; For students &middot; June 18, 2026</p>
            <h1>How to beat interview nerves before the big day</h1>
            <p className="lead">Nerves aren&apos;t a character flaw. They&apos;re your body reacting to something that feels high-stakes and unfamiliar. The good news: you can make it feel familiar.</p>

            <aside className="aeo-answer">
              <span className="aeo-label">In short</span>
              <p>To beat interview nerves, make the interview feel familiar before the big day: rehearse your answers out loud instead of only in your head, practice under realistic conditions, breathe slowly to steady yourself right before you start, and reframe the nerves as normal energy rather than a warning sign.</p>
            </aside>

            <h2>Why nerves spike</h2>
            <p>Most interview anxiety comes from uncertainty. You don&apos;t know what they&apos;ll ask, how you&apos;ll sound, or whether you&apos;ll freeze. Each unknown adds pressure. Remove the unknowns and the pressure drops on its own.</p>

            <h2>What actually helps</h2>
            <ul>
              <li><strong>Rehearse out loud.</strong> Thinking through an answer and saying it are different skills. Practice the one you&apos;ll use.</li>
              <li><strong>Repeat until it&apos;s boring.</strong> The tenth time you answer &ldquo;tell me about yourself,&rdquo; your heart rate barely moves. That&apos;s the goal.</li>
              <li><strong>Get feedback, then adjust.</strong> Practicing a weak answer just makes it well-rehearsed. Feedback tells you what to change.</li>
              <li><strong>Simulate the real thing.</strong> One question at a time, no script in front of you. Comfortable practice doesn&apos;t build composure.</li>
            </ul>

            <blockquote>Confidence isn&apos;t the absence of nerves. It&apos;s having done the thing so many times that nerves no longer change the outcome.</blockquote>

            <h2>A simple week-before plan</h2>
            <ol>
              <li>Do a full mock interview every day, even just ten minutes.</li>
              <li>Read your feedback and pick one thing to fix.</li>
              <li>Redo the questions you fumbled.</li>
              <li>The night before, do an easy session to end on a win, then stop.</li>
            </ol>

            <p>Almaprep is built for exactly this: realistic questions, instant feedback, unlimited reps, free.</p>
            <p><Link className="btn btn-primary" href="/signup">Start practicing free &rarr;</Link></p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
