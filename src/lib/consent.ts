/**
 * Analytics consent, stored per browser.
 *
 * Deliberately NOT in lib/localStore: consent is a property of the browser and
 * must survive sign-out, whereas everything in localStore is wiped on logout.
 */
export const CONSENT_STORAGE_KEY = "almaprep-analytics-consent"

export function readConsent(): boolean | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (raw === "granted") return true
    if (raw === "denied") return false
    return null
  } catch {
    return null
  }
}

export function writeConsent(granted: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, granted ? "granted" : "denied")
  } catch {
    // storage disabled — treat as "no consent" on the next read
  }
}
