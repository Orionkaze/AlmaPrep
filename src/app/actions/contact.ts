"use server"

import { headers } from "next/headers"
import { createHash } from "crypto"
import { validateContactLead } from "@/lib/validation/contact"
import { rateLimit } from "@/lib/rateLimit"
import { sendSalesEmail } from "@/lib/email"
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

    // Timing: forms submitted in under 3s, or with a stale/absent timestamp,
    // are almost certainly bots. Silently accept without persisting.
    const now = Date.now()
    const ts = Number(formData.get("ts"))
    if (!ts || now - ts < 3000 || now - ts > 24 * 60 * 60 * 1000) {
      return { success: true }
    }

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

    // Email the lead to sales. This is the delivery; without a mail key set,
    // sendSalesEmail logs it and reports ok so the flow works in dev.
    const result = await sendSalesEmail({
      to: [SALES_EMAIL],
      replyTo: lead.email,
      subject: `New ${lead.plan || "sales"} lead: ${lead.institution}`,
      text: [
        `Name:        ${lead.name}`,
        `Email:       ${lead.email}`,
        `Institution: ${lead.institution}`,
        `Role:        ${lead.role || "-"}`,
        `Students:    ${lead.students || "-"}`,
        `Plan:        ${lead.plan || "-"}`,
        `Source:      ${lead.source || "-"}`,
        ``,
        lead.message || "(no message)",
      ].join("\n"),
    })

    if (!result.ok) {
      console.error("[contact] email send failed:", result.error)
      return {
        success: false,
        error: `Sorry, we couldn't send your message. Please email us directly at ${SALES_EMAIL}.`,
      }
    }

    return { success: true }
  } catch (err) {
    console.error("[contact] unexpected failure:", err)
    return {
      success: false,
      error: "Something went wrong. Please email us directly.",
    }
  }
}
