import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { safeNextPath, allowedHost } from '@/lib/authCallbackUtils'
import { isMockAuthEnabled } from '@/lib/env'

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
        // isMockAuthEnabled() is the single answer to "are we faking auth", and
        // it is hard-disabled in production (see lib/env.ts). Deriving it here
        // from a raw env read plus "?provider= is present" put mock behaviour
        // back within reach of a query string on the live site: the mock branch
        // writes a cookie instead of creating the user's row, so a real GitHub
        // signup that carried &provider= ended up with no profile at all.
        const isMockMode = isMockAuthEnabled()

        // The query param is part of the mock OAuth shim, so it is only
        // trustworthy when the shim is what redirected here. Real logins are
        // identified from the session Supabase just handed us.
        const providerParam = isMockMode ? searchParams.get('provider') : null
        const rawProvider = providerParam || user.app_metadata?.provider || ""
        const providersList = user.app_metadata?.providers || []
        const identitiesList = user.identities || []
        const isGitHub = 
          rawProvider === 'github' ||
          providersList.includes('github') ||
          identitiesList.some(id => id.provider === 'github')

        const provider = isGitHub ? 'github' : (rawProvider || 'email')
        
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
