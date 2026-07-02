import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

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
  const hasNextAuthCookie = request.cookies.has("next-auth.session-token") ||
                            request.cookies.has("__Secure-next-auth.session-token")
  const hasDemoCookie = request.cookies.has("mockmate-demo-session")
  const hasSupabaseSession = request.cookies.getAll().some(c => c.name.startsWith("sb-"))

  const path = request.nextUrl.pathname
  const isProtectedRoute = path === '/' ||
                           path.startsWith('/dashboard') || 
                           path.startsWith('/interview') ||
                           path.startsWith('/onboarding')

  if (hasDemoCookie) {
    if (path === '/login' || path === '/signup') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  // Skip Supabase auth if credentials aren't configured yet or are mock
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isMockMode = !supabaseUrl || !supabaseKey || supabaseUrl.includes("mock-supabase-project-id")

  if (isMockMode) {
    if (isProtectedRoute && !hasNextAuthCookie) {
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
    supabaseUrl,
    supabaseKey,
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
  if (hasNextAuthCookie && !hasSupabaseSession) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
      if (token?.email) {
        const secret = process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0"
        const password = await generateDeterministicPasswordWebCrypto(token.email, secret)
        const { error } = await supabase.auth.signInWithPassword({
          email: token.email,
          password,
        })
        if (error) {
          console.error("Middleware: Failed to sync Supabase session for", token.email, error.message)
        } else {
          console.log("Middleware: Successfully synced Supabase session for", token.email)
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

  if (hasNextAuthCookie) {
    if (path === '/login' || path === '/signup') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}



