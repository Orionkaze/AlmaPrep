"use client"

import { useActionState, useEffect, useRef } from "react"
import { submitContactSales, type ContactState } from "@/app/actions/contact"

const initialState: ContactState = { success: false }

export default function ContactSalesForm({
  source = "institutions",
  plan = "",
}: {
  source?: string
  plan?: string
}) {
  const [state, formAction, pending] = useActionState(
    submitContactSales,
    initialState
  )
  // Stamp the mount time into the hidden field AFTER hydration by writing to the
  // DOM node directly (not via state during render), so the server and client
  // HTML match and there is no hydration mismatch. The server treats a missing
  // or too-fast (<3s) timestamp as spam, so an early submit fails safe.
  const tsRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (tsRef.current) tsRef.current.value = String(Date.now())
  }, [])

  if (state.success) {
    return (
      <div className="lead-form reveal" role="status">
        <h3 style={{ marginTop: 0 }}>Thanks — we&apos;ve got your request.</h3>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Someone from the team will be in touch shortly. If it&apos;s urgent, email
          us at{" "}
          <a href="mailto:partnerships@almaprep.app">partnerships@almaprep.app</a>.
        </p>
      </div>
    )
  }

  const fieldErrors = state.fieldErrors ?? {}
  const errStyle = { color: "#dc2626", fontSize: ".82rem", marginTop: "4px" }

  return (
    <form className="lead-form reveal" action={formAction}>
      {/* Honeypot: kept off-screen, not display:none, so bots fill it. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
      />
      <input type="hidden" name="ts" ref={tsRef} defaultValue="0" />
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="source" value={source} />

      {state.error && (
        <div
          role="alert"
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(220,38,38,.25)",
            background: "rgba(220,38,38,.08)",
            color: "#dc2626",
            fontSize: ".9rem",
          }}
        >
          {state.error}
        </div>
      )}

      <div className="row">
        <div className="field">
          <label htmlFor="lf-name">Your name</label>
          <input type="text" id="lf-name" name="name" required autoComplete="name" />
          {fieldErrors.name && <p style={errStyle}>{fieldErrors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="lf-email">Work email</label>
          <input type="email" id="lf-email" name="email" required autoComplete="email" />
          {fieldErrors.email && <p style={errStyle}>{fieldErrors.email}</p>}
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="lf-org">Institution</label>
          <input
            type="text"
            id="lf-org"
            name="institution"
            required
            autoComplete="organization"
          />
          {fieldErrors.institution && <p style={errStyle}>{fieldErrors.institution}</p>}
        </div>
        <div className="field">
          <label htmlFor="lf-role">Your role</label>
          <input
            type="text"
            id="lf-role"
            name="role"
            placeholder="e.g. Admissions counselor"
          />
          {fieldErrors.role && <p style={errStyle}>{fieldErrors.role}</p>}
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
        {fieldErrors.students && <p style={errStyle}>{fieldErrors.students}</p>}
      </div>
      <div className="field">
        <label htmlFor="lf-msg">Anything we should know? (optional)</label>
        <textarea
          id="lf-msg"
          name="message"
          placeholder="Your timeline, goals, or questions"
        ></textarea>
        {fieldErrors.message && <p style={errStyle}>{fieldErrors.message}</p>}
      </div>
      <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request a demo →"}
      </button>
      <p
        style={{
          margin: "14px 0 0",
          color: "var(--muted)",
          fontSize: ".85rem",
          textAlign: "center",
        }}
      >
        Prefer email? Reach us at{" "}
        <a href="mailto:partnerships@almaprep.app">partnerships@almaprep.app</a>.
      </p>
    </form>
  )
}
