import { SITE_URL } from '@/lib/siteConfig'

/**
 * Only same-site paths are acceptable redirect targets. `next` arrives in the
 * query string, so "https://evil.example" or "//evil.example" must not survive.
 */
export function safeNextPath(raw: string | null): string {
  const fallback = '/onboarding'
  if (!raw) return fallback
  // Must be a single-slash absolute path. This rejects absolute URLs,
  // protocol-relative "//host", and the backslash variants browsers normalise.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}

/**
 * `x-forwarded-host` is a request header and therefore attacker-supplied unless
 * the platform overwrites it. Redirecting to it unchecked turns this endpoint
 * into an open redirect, so it is only honoured when it matches a host we were
 * actually deployed under.
 */
export function allowedHost(forwardedHost: string | null, requestOrigin: string): string | null {
  if (!forwardedHost) return null
  const permitted = new Set<string>()
  for (const candidate of [SITE_URL, process.env.NEXTAUTH_URL, requestOrigin]) {
    if (!candidate) continue
    try {
      permitted.add(new URL(candidate).host)
    } catch {
      // ignore an unparseable configured value
    }
  }
  return permitted.has(forwardedHost) ? forwardedHost : null
}
