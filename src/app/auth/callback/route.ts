import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log("Supabase OAuth Session Exchange Success:", {
        hasSession: !!data?.session,
        hasProviderToken: !!data?.session?.provider_token,
        expiresIn: data?.session?.expires_in
      })
      if (data?.session?.provider_token) {
        const cookieStore = await cookies()
        cookieStore.set('sb-github-provider-token', data.session.provider_token, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: data.session.expires_in || 3600,
        })
      }
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can redirect to local origin directly
        return NextResponse.redirect(`${origin}${next}`)
      }
      const forwardedHost = allowedHost(request.headers.get('x-forwarded-host'), origin)
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("Supabase OAuth code exchange failed:", error)
    }
  }

  // Send a fixed code rather than free text: the login page renders whatever
  // arrives here, so an echoed message lets anyone put their own words on our
  // sign-in screen.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
