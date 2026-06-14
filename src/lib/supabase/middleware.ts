import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Skip Supabase auth if credentials aren't configured yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hasNextAuthCookie = request.cookies.has("next-auth.session-token") ||
                            request.cookies.has("__Secure-next-auth.session-token")
  const hasDemoCookie = request.cookies.has("mockmate-demo-session")
  const isAuthed = hasNextAuthCookie || hasDemoCookie || !!user

  const path = request.nextUrl.pathname
  // Protect routes here (including root '/')
  const isProtectedRoute = path === '/' ||
                           path.startsWith('/dashboard') || 
                           path.startsWith('/interview') ||
                           path.startsWith('/onboarding')

  if (!isAuthed && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user exists and tries to access login/signup, redirect to dashboard
  if (isAuthed && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

