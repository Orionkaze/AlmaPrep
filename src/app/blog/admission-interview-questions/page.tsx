import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import JsonLd from "@/components/JsonLd"
import { pageMetadata, blogPostingLd, breadcrumbLd } from "@/lib/seo"

const PATH = "/blog/admission-interview-questions"
const TITLE = "10 College Admission Interview Questions & Answers"
const DESC =
  "The ten questions you can almost count on in a college admission interview, plus a simple, human way to answer each one using the STAR method."
const PUBLISHED = "2026-06-10"

export const metadata = pageMetadata({ title: TITLE, description: DESC, path: PATH, type: "article" })

export default function AdmissionQuestionsPage() {
  return (
    <div className="almaprep-theme">
      <JsonLd data={blogPostingLd({ headline: TITLE, description: DESC, path: PATH, datePublished: PUBLISHED })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: TITLE, path: PATH }])} />
      <RevealOnScroll />
      <Header />

      <main>
        <article className="section">
          <div className="wrap prose">
            <p className="eyebrow"><Link href="/blog">&larr; Blog</Link> &middot; For students &middot; June 10, 2026</p>
            <h1>10 college admission interview questions (and how to answer them)</h1>
            <p className="lead">Admission interviews feel unpredictable, but most of them circle the same ground. Here are ten questions you can almost count on, and a simple way to answer each.</p>

            <aside className="aeo-answer">
              <span className="aeo-label">In short</span>
              <p>The most common college admission interview questions are &ldquo;Tell me about yourself,&rdquo; &ldquo;Why this program?,&rdquo; and behavioral &ldquo;tell me about a time&rdquo; questions. Answer each with a short, specific story using the STAR method (Situation, Task, Action, Result), and keep it conversational rather than rehearsed.</p>
            </aside>

            <h2>The framework: STAR, but human</h2>
            <p>For any &ldquo;tell me about a time&rdquo; question, lean on <strong>STAR</strong>: Situation, Task, Action, Result. Set the scene briefly, say what you needed to do, explain what <em>you</em> did, and end with what happened. Keep it conversational, not robotic.</p>

            <h2>The ten questions</h2>
            <ol>
              <li><strong>Tell me about yourself.</strong> Give a short arc, not your whole life. One line on who you are, one on what you care about, one on why you&apos;re here.</li>
              <li><strong>Why this program?</strong> Name something specific to the school. Generic flattery is obvious; a real detail is memorable.</li>
              <li><strong>What&apos;s a challenge you overcame?</strong> Use STAR. Pick a real setback and focus on what you learned.</li>
              <li><strong>What are you most proud of?</strong> Choose something that shows effort over time, not luck.</li>
              <li><strong>Describe a time you led.</strong> Leadership isn&apos;t a title. A moment you stepped up counts.</li>
              <li><strong>How do you handle failure?</strong> Show that you reflect and adjust, with one concrete example.</li>
              <li><strong>What would your friends say about you?</strong> Pick one honest trait and back it with a small story.</li>
              <li><strong>Where do you see yourself in five years?</strong> Direction matters more than a precise plan.</li>
              <li><strong>What do you do outside class?</strong> Depth beats a long list. Talk about one thing you genuinely love.</li>
              <li><strong>Do you have questions for us?</strong> Always yes. Ask something you actually want to know.</li>
            </ol>

            <blockquote>The students who do best aren&apos;t the ones with perfect answers. They&apos;re the ones who&apos;ve said their answers out loud enough times that nerves stop hijacking them.</blockquote>

            <h2>Practice the way you&apos;ll perform</h2>
            <p>Reading these is a start. Saying them, getting feedback, and trying again is what actually moves the needle. That&apos;s exactly what Almaprep is for, and it&apos;s free.</p>
            <p><Link className="btn btn-primary" href="/signup">Practice these free &rarr;</Link></p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
