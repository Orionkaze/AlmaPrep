import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/onboarding'

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
      const forwardedHost = request.headers.get('x-forwarded-host') // Original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can redirect to local origin directly
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error("Supabase OAuth code exchange failed:", error)
    }
  }

  // return the user to an error page or home/login with some instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
