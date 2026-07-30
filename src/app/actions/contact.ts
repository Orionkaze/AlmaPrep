"use server"

import { headers } from "next/headers"
import { createHash } from "crypto"
import { validateContactLead } from "@/lib/validation/contact"
import { rateLimit } from "@/lib/rateLimit"
import { SALES_EMAIL } from "@/config/plans"

export type ContactState = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

/** Salted hash of the client IP — we never store or log a raw IP. */
function hashIp(ip: string): string {
  const salt = process.env.NEXTAUTH_SECRET ?? "almaprep-salt"
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32)
}

/**
 * Handle a contact-sales submission: validate → spam checks → email the lead to
 * sales. Email is the delivery mechanism (form + mail); there is no database
 * step. If the email fails to send, the user is told so the lead isn't lost
 * silently. Never throws.
 *
 * Signature is (prevState, formData) for useActionState.
 */
export async function submitContactSales(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  try {
    // Honeypot: a real user never fills this hidden field. Lie to the bot.
    if ((formData.get("company_website") as string)?.trim()) {
      return { success: true }
    }

    // Timing: a form filled in under 3 seconds, or carrying a stale/absent
    // timestamp, is more likely a bot than a person.
    //
    // This used to silently return success and drop the submission — which also
    // silently dropped real leads whose browser autofilled the form and who hit
    // send quickly. A lost sales lead costs far more than a junk one, so the
    // signal is now forwarded as a flag and sales decides. The honeypot above
    // still hard-drops, because nothing legitimate fills a hidden field.
    const now = Date.now()
    const ts = Number(formData.get("ts"))
    const suspectedBot = !ts || now - ts < 3000 || now - ts > 24 * 60 * 60 * 1000

    const validated = validateContactLead(formData)
    if (!validated.ok) {
      return {
        success: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: validated.fieldErrors,
      }
    }
    const lead = validated.data

    // Rate limit on hashed IP: 3 submissions per 10 minutes.
    const hdrs = await headers()
    const ip = (hdrs.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown"
    const ipHash = hashIp(ip)
    if (!rateLimit(`contact:${ipHash}`, 3, 10 * 60 * 1000, now)) {
      return {
        success: false,
        error: "Too many requests. Please try again in a few minutes.",
      }
    }

    // Send the lead to Formspree. Without a form ID set, we log it in dev mode.
    const formId = process.env.FORMSPREE_FORM_ID
    if (!formId) {
      console.log(
        `[contact] Dev mode Formspree submission (FORMSPREE_FORM_ID missing):\n`,
        lead
      )
      return { success: true }
    }

    try {
      const res = await fetch(`https://formspree.io/f/${formId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          institution: lead.institution,
          role: lead.role || "",
          students: lead.students || "",
          plan: lead.plan || "",
          source: lead.source || "",
          message: lead.message || "",
          ...(suspectedBot ? { suspected_bot: true } : {}),
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("[contact] Formspree submission failed:", res.status, errorText)
        return {
          success: false,
          error: `Sorry, we couldn't send your message. Please email us directly at ${SALES_EMAIL}.`,
        }
      }

      return { success: true }
    } catch (err) {
      console.error("[contact] Formspree unexpected error:", err)
      return {
        success: false,
        error: "Something went wrong. Please try again later.",
      }
    }
  } catch (err) {
    console.error("[contact] unexpected failure:", err)
    return {
      success: false,
      error: "Something went wrong. Please email us directly.",
    }
  }
}
