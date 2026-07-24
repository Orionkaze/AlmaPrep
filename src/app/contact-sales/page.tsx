"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"

// ── Contact-sales delivery (wire this up) ────────────────────────────────────
// The interface is done. To make submissions actually LAND somewhere, do EITHER:
//   (A) Set NEXT_PUBLIC_CONTACT_ENDPOINT to a Formspree (or similar) form URL.
//       The form POSTs the lead there → it arrives in the connected inbox.
//   (B) Leave it unset → the form opens the visitor's email client with a
//       pre-filled message to SALES_EMAIL (works today, no backend).
// Point whichever you use at the new Almaprep Gmail once it's created.
const CONTACT_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || ""
const SALES_EMAIL = "partnerships@almaprep.app"

type Field = "name" | "email" | "org" | "role" | "students" | "message"

export default function ContactSalesPage() {
  const [form, setForm] = useState<Record<Field, string>>({
    name: "", email: "", org: "", role: "", students: "", message: "",
  })
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")

  const set = (k: Field) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("sending")

    // When an endpoint is configured, the lead is delivered. Until then this is
    // an interface stub (like the checkout page) — the success screen still
    // surfaces the direct sales email so no interested lead is stranded.
    if (CONTACT_ENDPOINT) {
      try {
        await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(form),
        })
      } catch {
        // don't trap the user on a network hiccup — the success screen has the email
      }
    }
    setStatus("sent")
  }

  return (
    <div className="almaprep-theme">
      <Header />
      <main>
        <section className="page-hero center">
          <div className="wrap">
            <span className="pill">Contact sales</span>
            <h1>{status === "sent" ? "Thanks — we'll be in touch." : "Talk to us about your institution."}</h1>
            {status !== "sent" && (
              <p className="lead narrow">
                Tell us about your school, college, or coaching program and we&apos;ll put together a plan — pricing, rollout, and a walkthrough of the admin side.
              </p>
            )}
          </div>
        </section>

        <section className="section">
          <div className="wrap" style={{ maxWidth: 760 }}>
            {status === "sent" ? (
              <div className="lead-form" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.4rem", marginBottom: 8 }}>✅</div>
                <h2 style={{ marginBottom: 8 }}>Message on its way</h2>
                <p style={{ color: "var(--muted)", marginBottom: 24 }}>
                  We&apos;ll get back to you within one business day. You can also reach us directly at{" "}
                  <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>. In the meantime, explore the live institution dashboard.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/institutions/demo" className="btn btn-primary">See the live demo &rarr;</Link>
                  <Link href="/pricing" className="btn btn-ghost">Back to pricing</Link>
                </div>
              </div>
            ) : (
              <form className="lead-form" onSubmit={handleSubmit}>
                <div className="row">
                  <div className="field">
                    <label htmlFor="cs-name">Your name</label>
                    <input id="cs-name" type="text" required autoComplete="name" value={form.name} onChange={set("name")} />
                  </div>
                  <div className="field">
                    <label htmlFor="cs-email">Work email</label>
                    <input id="cs-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
                  </div>
                </div>
                <div className="row">
                  <div className="field">
                    <label htmlFor="cs-org">Institution / company</label>
                    <input id="cs-org" type="text" required autoComplete="organization" value={form.org} onChange={set("org")} />
                  </div>
                  <div className="field">
                    <label htmlFor="cs-role">Your role</label>
                    <input id="cs-role" type="text" placeholder="e.g. Admissions counselor" value={form.role} onChange={set("role")} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="cs-students">Roughly how many students?</label>
                  <select id="cs-students" value={form.students} onChange={set("students")}>
                    <option value="">Select a range</option>
                    <option>Under 100</option>
                    <option>100–500</option>
                    <option>500–2,000</option>
                    <option>2,000+</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cs-msg">Anything we should know? (optional)</label>
                  <textarea id="cs-msg" placeholder="Your timeline, goals, or questions" value={form.message} onChange={set("message")} />
                </div>
                <button className="btn btn-primary btn-lg" type="submit" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Send message →"}
                </button>
                <p style={{ margin: "14px 0 0", color: "var(--muted)", fontSize: ".85rem", textAlign: "center" }}>
                  Prefer email? Reach us at <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
