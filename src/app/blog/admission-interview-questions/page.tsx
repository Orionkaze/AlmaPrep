import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"

export default function AdmissionQuestionsPage() {
  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <article className="section">
          <div className="wrap prose">
            <p className="eyebrow"><Link href="/blog">&larr; Blog</Link> &middot; For students</p>
            <h1>10 college admission interview questions (and how to answer them)</h1>
            <p className="lead">Admission interviews feel unpredictable, but most of them circle the same ground. Here are ten questions you can almost count on, and a simple way to answer each.</p>

            <h2>The framework: STAR, but human</h2>
            <p>For any "tell me about a time" question, lean on <strong>STAR</strong>: Situation, Task, Action, Result. Set the scene briefly, say what you needed to do, explain what <em>you</em> did, and end with what happened. Keep it conversational, not robotic.</p>

            <h2>The ten questions</h2>
            <ol>
              <li><strong>Tell me about yourself.</strong> Give a short arc, not your whole life. One line on who you are, one on what you care about, one on why you're here.</li>
              <li><strong>Why this program?</strong> Name something specific to the school. Generic flattery is obvious; a real detail is memorable.</li>
              <li><strong>What's a challenge you overcame?</strong> Use STAR. Pick a real setback and focus on what you learned.</li>
              <li><strong>What are you most proud of?</strong> Choose something that shows effort over time, not luck.</li>
              <li><strong>Describe a time you led.</strong> Leadership isn't a title. A moment you stepped up counts.</li>
              <li><strong>How do you handle failure?</strong> Show that you reflect and adjust, with one concrete example.</li>
              <li><strong>What would your friends say about you?</strong> Pick one honest trait and back it with a small story.</li>
              <li><strong>Where do you see yourself in five years?</strong> Direction matters more than a precise plan.</li>
              <li><strong>What do you do outside class?</strong> Depth beats a long list. Talk about one thing you genuinely love.</li>
              <li><strong>Do you have questions for us?</strong> Always yes. Ask something you actually want to know.</li>
            </ol>

            <blockquote>The students who do best aren't the ones with perfect answers. They're the ones who've said their answers out loud enough times that nerves stop hijacking them.</blockquote>

            <h2>Practice the way you'll perform</h2>
            <p>Reading these is a start. Saying them, getting feedback, and trying again is what actually moves the needle. That's exactly what Almaprep is for, and it's free.</p>
            <p><Link className="btn btn-primary" href="/signup">Practice these free &rarr;</Link></p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
