import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/server"
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

          // 1. Try to sign in to Supabase auth with deterministic password
          let signInResult = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
          })

          if (signInResult.error) {
            // 2. If sign in fails, the user might not exist in Supabase auth yet. Try signing up.
            const { error: signUpError } = await supabase.auth.signUp({
              email: user.email,
              password,
            })

            if (signUpError) {
              console.error("Google login: Failed to auto-provision Supabase user auth:", signUpError.message)
              return false
            }

            // 3. Retry signing in to set session cookies
            signInResult = await supabase.auth.signInWithPassword({
              email: user.email,
              password,
            })

            if (signInResult.error) {
              console.error("Google login: Failed to sign in to auto-provisioned Supabase account:", signInResult.error.message)
              return false
            }
          }

          // Store the Supabase user ID inside the NextAuth user object for session/jwt callbacks
          if (signInResult.data.user) {
            user.id = signInResult.data.user.id
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
