"use client"

import { useActionState, useEffect } from "react"
import { startCheckout, type CheckoutState } from "@/app/actions/checkout"

const initial: CheckoutState = { status: "idle" }

export default function UpgradeButton({ plan = "pro" }: { plan?: string }) {
  const [state, formAction, pending] = useActionState(startCheckout, initial)

  // When a real provider is connected, it returns a URL to redirect to.
  useEffect(() => {
    if (state.status === "redirect") {
      window.location.href = state.url
    }
  }, [state])

  return (
    <form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Upgrade to Pro →"}
      </button>

      {state.status === "comingSoon" && (
        <p style={{ marginTop: "14px", color: "var(--muted)", fontSize: ".9rem" }}>
          Online payments are launching soon. In the meantime,{" "}
          <a href="/contact?plan=pro">get in touch</a> and we&apos;ll set you up.
        </p>
      )}
      {state.status === "error" && (
        <p style={{ marginTop: "14px", color: "#dc2626", fontSize: ".9rem" }}>
          {state.error}
        </p>
      )}
    </form>
  )
}
