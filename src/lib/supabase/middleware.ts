import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { verifyJWT } from '@/lib/jwt'
import { getAuthSecret, isMockAuthEnabled } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { bridgeGoogleUserToSupabase } from '@/lib/supabaseAuthBridge'

async function generateDeterministicPasswordWebCrypto(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(email)
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    messageData
  )
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function updateSession(request: NextRequest) {
  const secret = getAuthSecret()

  // Verify the NextAuth JWT rather than checking whether a cookie with that
  // name exists. Cookie presence is attacker-controlled: any visitor could set
  // `next-auth.session-token=anything` and, below, both skip the protected-route
  // redirect and short-circuit the Supabase user lookup.
  const nextAuthToken = await getToken({ req: request, secret }).catch(() => null)
  const hasNextAuthSession = !!nextAuthToken
  const hasSupabaseSession = request.cookies.getAll().some(c => c.name.startsWith("sb-"))

  const path = request.nextUrl.pathname
  // '/' is deliberately absent: it is the public marketing page.
  const isProtectedRoute = path.startsWith('/dashboard') ||
                           path.startsWith('/interview') ||
                           path.startsWith('/onboarding') ||
                           path.startsWith('/profile') ||
                           path.startsWith('/history') ||
                           path.startsWith('/settings')

  // Check and verify mock JWT session if in mock mode
  if (isMockAuthEnabled()) {
    const mockSessionCookie = request.cookies.get("mockmate-mock-session")?.value
    if (mockSessionCookie) {
      const payload = await verifyJWT(mockSessionCookie, secret)
      if (payload) {
        if (path === '/login' || path === '/signup') {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
        return NextResponse.next({ request })
      }
    }

    if (isProtectedRoute && !hasNextAuthSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    // Mock auth is off and there is no project configured. Refuse to serve
    // protected routes rather than letting them through unauthenticated.
    console.error("[middleware] Supabase env vars missing and NEXT_PUBLIC_MOCK_AUTH is not set")
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Sync NextAuth session to Supabase if Supabase cookies are missing
  if (hasNextAuthSession && !hasSupabaseSession) {
    try {
      const token = nextAuthToken
      if (token?.email) {
        const password = await generateDeterministicPasswordWebCrypto(token.email, secret)
        // Same ladder as the NextAuth signIn callback: derived password first,
        // then provision, then magic link for an account that already has a
        // password of its own. Never overwrite a stored password from here.
        const bridged = await bridgeGoogleUserToSupabase(
          supabase,
          createAdminClient(),
          token.email,
          password
        )
        if (!bridged.ok) {
          // No email in the log line. This runs on a normal request path for
          // signed-in students, many of them minors, and naming them is PII
          // written to the server log for no benefit.
          console.error("Middleware: Failed to sync Supabase session:", bridged.reason)
        }
      }
    } catch (err) {
      console.error("Middleware: Unexpected error syncing session:", err)
    }
  }

  let user = null
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    user = supabaseUser
  } catch (err) {
    console.error("Supabase auth error in middleware:", err)
  }

  if (hasNextAuthSession) {
    if (path === '/login' || path === '/signup') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return addSecurityHeaders(NextResponse.redirect(url))
    }
    return addSecurityHeaders(supabaseResponse)
  }

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  return addSecurityHeaders(supabaseResponse)
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://*.sentry.io https://*.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.fortawesome.com",
    "connect-src 'self' https://*.supabase.co https://*.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://formspree.io https://api.github.com",
    "img-src 'self' blob: data: https://*.supabase.co https://*.posthog.com https://*.githubusercontent.com https://*.googleusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com https://*.fortawesome.com",
    "frame-src 'self' https://*.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join("; ")
  
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
  
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  }
  return response
}



