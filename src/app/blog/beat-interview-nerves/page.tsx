import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function BeatNervesPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <article className="section">
          <div className="wrap prose">
            <p className="eyebrow"><Link href="/blog">&larr; Blog</Link> &middot; For students</p>
            <h1>How to beat interview nerves before the big day</h1>
            <p className="lead">Nerves aren't a character flaw. They're your body reacting to something that feels high-stakes and unfamiliar. The good news: you can make it feel familiar.</p>

            <h2>Why nerves spike</h2>
            <p>Most interview anxiety comes from uncertainty. You don't know what they'll ask, how you'll sound, or whether you'll freeze. Each unknown adds pressure. Remove the unknowns and the pressure drops on its own.</p>

            <h2>What actually helps</h2>
            <ul>
              <li><strong>Rehearse out loud.</strong> Thinking through an answer and saying it are different skills. Practice the one you'll use.</li>
              <li><strong>Repeat until it's boring.</strong> The tenth time you answer "tell me about yourself," your heart rate barely moves. That's the goal.</li>
              <li><strong>Get feedback, then adjust.</strong> Practicing a weak answer just makes it well-rehearsed. Feedback tells you what to change.</li>
              <li><strong>Simulate the real thing.</strong> One question at a time, no script in front of you. Comfortable practice doesn't build composure.</li>
            </ul>

            <blockquote>Confidence isn't the absence of nerves. It's having done the thing so many times that nerves no longer change the outcome.</blockquote>

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
