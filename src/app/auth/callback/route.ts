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

      // Check if user is authenticated and get provider
      const user = data?.user
      if (user) {
        const isMockMode = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' || searchParams.get('provider') !== null
        const provider = searchParams.get('provider') || user.app_metadata?.provider || user.identities?.find(id => id.provider)?.provider || 'email'
        
        if (provider === 'github') {
          // GitHub login flow: Automatically assign GitHub username & skip username selection
          const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email?.split('@')[0] || 'User'
          
          if (isMockMode) {
            const cookieStore = await cookies()
            cookieStore.set(
              "mockmate-demo-user",
              JSON.stringify({
                email: user.email || "github-user@mockmate.com",
                username: githubUsername,
                avatar_url: "laptop-code"
              }),
              { path: "/", maxAge: 604800 }
            )
          } else {
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('users')
              .select('id, username')
              .eq('id', user.id)
              .maybeSingle()
            
            if (!existingProfile) {
              // Automatically resolve collision by appending sequence numbers if username is already taken
              let targetUsername = githubUsername.trim()
              let unique = false
              let attempt = 0
              while (!unique && attempt < 10) {
                const testUsername = attempt === 0 ? targetUsername : `${targetUsername}-${attempt}`
                const { data: duplicate } = await supabase
                  .from('users')
                  .select('id')
                  .eq('username', testUsername)
                  .maybeSingle()
                
                if (!duplicate) {
                  targetUsername = testUsername
                  unique = true
                } else {
                  attempt++
                }
              }
              if (!unique) {
                targetUsername = `${targetUsername}-${Math.floor(1000 + Math.random() * 9000)}`
              }

              // Create profile in database
              const { error: insertErr } = await supabase
                .from('users')
                .upsert({
                  id: user.id,
                  username: targetUsername,
                  avatar_url: 'laptop-code',
                }, { onConflict: 'id' })

              if (insertErr) {
                console.error("Failed to automatically create user profile for GitHub user:", insertErr)
              }
            }
          }

          // GitHub users go directly to the dashboard
          const isLocalEnv = process.env.NODE_ENV === 'development'
          if (isLocalEnv) {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
          const forwardedHost = allowedHost(request.headers.get('x-forwarded-host'), origin)
          if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}/dashboard`)
          }
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // Non-GitHub users (Google, Manual, etc.) must go through username selection if new
          let hasProfile = false
          if (isMockMode) {
            const cookieStore = await cookies()
            hasProfile = cookieStore.has("mockmate-demo-user")
          } else {
            const { data: existingProfile } = await supabase
              .from('users')
              .select('id, username')
              .eq('id', user.id)
              .maybeSingle()
            hasProfile = !!existingProfile
          }

          const redirectPath = hasProfile ? '/dashboard' : '/onboarding'
          const isLocalEnv = process.env.NODE_ENV === 'development'
          if (isLocalEnv) {
            return NextResponse.redirect(`${origin}${redirectPath}`)
          }
          const forwardedHost = allowedHost(request.headers.get('x-forwarded-host'), origin)
          if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
          }
          return NextResponse.redirect(`${origin}${redirectPath}`)
        }
      }

      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
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

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
