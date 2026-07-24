import type { DefaultSession } from "next-auth"

// Augment next-auth's built-in types so `session.user.id` / `token.id` are
// typed instead of requiring `as any` at every call site. `id` is the
// Supabase auth user id, set in the `signIn`/`jwt` callbacks in `lib/auth.ts`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
  }
}
