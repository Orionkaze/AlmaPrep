import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"
import RevealOnScroll from "@/components/almaprep/RevealOnScroll"
import ContactSalesForm from "@/components/almaprep/ContactSalesForm"

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const raw = (await searchParams).plan
  const planParam = Array.isArray(raw) ? raw[0] : raw
  const plan = planParam === "pro" || planParam === "enterprise" ? planParam : ""

  const heading =
    plan === "pro"
      ? "Let's get you set up with Pro."
      : plan === "enterprise"
        ? "Let's talk about your institution."
        : "Talk to us."

  const lead =
    plan === "pro"
      ? "Tell us a little about yourself and we'll help you get started."
      : "Tell us about your program and we'll set up a walkthrough and a plan that fits."

  return (
    <div className="almaprep-theme">
      <RevealOnScroll />
      <Header />

      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Contact</span>
            <h1>{heading}</h1>
            <p className="lead narrow">{lead}</p>
          </div>
        </section>

        <section className="section">
          <div className="wrap" style={{ maxWidth: "760px" }}>
            <ContactSalesForm source="contact" plan={plan} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
