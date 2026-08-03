import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `monitoring` is Sentry's tunnelRoute (next.config.ts). Sentry's own docs
    // warn that middleware matching it breaks client-side error reporting, and
    // it would otherwise cost a Supabase getUser() round trip per event.
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
