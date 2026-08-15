import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { bridgeGoogleUserToSupabase } from "@/lib/supabaseAuthBridge"
import { getAuthSecret } from "@/lib/env"
import crypto from "crypto"

/**
 * WARNING FOR FUTURE DEVELOPERS:
 * The NEXTAUTH_SECRET is used to generate deterministic passwords for Google-provisioned Supabase users.
 * Do NOT rotate NEXTAUTH_SECRET casually! Rotating it will change the generated passwords, preventing
 * existing Google Sign-In users from authenticating with their mapped Supabase accounts and causing RLS/data loss.
 *
 * It also must never have a committed fallback value: anyone holding the secret
 * can compute any user's Supabase password from their email address. getAuthSecret()
 * throws in production rather than substituting one.
 */
function generateDeterministicPassword(email: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(email)
    .digest("hex")
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }

        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) {
          throw new Error(error?.message || "Invalid credentials")
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.email?.split("@")[0] || "User",
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          console.error("Google login: No email provided in user profile")
          return false
        }

        const secret = getAuthSecret()

        try {
          const supabase = await createClient()
          const password = generateDeterministicPassword(user.email, secret)

          // Sign in with the derived password, provisioning the Supabase
          // account if this is a first visit. An account the student created
          // themselves keeps its own password — see lib/supabaseAuthBridge.ts
          // for why that matters.
          const bridged = await bridgeGoogleUserToSupabase(supabase, createAdminClient(), user.email, password)

          if (!bridged.ok) {
            // No email in the log line. Sign-in runs for students, many of them
            // minors, and naming them buys nothing a reason string does not.
            console.error("Google login: could not establish a Supabase session:", bridged.reason)
            return false
          }

          // Store the Supabase user ID inside the NextAuth user object for session/jwt callbacks
          if (bridged.userId) {
            user.id = bridged.userId
          }
        } catch (err) {
          console.error("Google login: Unexpected error during Supabase sync:", err)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
