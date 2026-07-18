type EmailMessage = {
  to: string[]
  subject: string
  text: string
  /** Set to the lead's address so a reply goes straight back to them. */
  replyTo?: string
}

/**
 * Send a sales-notification email. Uses Resend when RESEND_API_KEY and
 * SALES_EMAIL_FROM are set; otherwise logs to the console so the contact flow
 * works before mail is configured. Resend's API is a plain JSON POST, so no npm
 * package is needed. Never throws.
 */
export async function sendSalesEmail(
  msg: EmailMessage
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.SALES_EMAIL_FROM

  if (!apiKey || !from) {
    console.log(
      `[email] would send to ${msg.to.join(", ")} | subject: ${msg.subject}\n${msg.text}`
    )
    return { ok: true }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? "send failed" }
  }
}
