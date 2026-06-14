import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

/**
 * WARNING FOR FUTURE DEVELOPERS:
 * The NEXTAUTH_SECRET is used to generate deterministic passwords for Google-provisioned Supabase users.
 * Do NOT rotate NEXTAUTH_SECRET casually! Rotating it will change the generated passwords, preventing 
 * existing Google Sign-In users from authenticating with their mapped Supabase accounts and causing RLS/data loss.
 */
function generateDeterministicPassword(email: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(email)
    .digest("hex")
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0",
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

        const secret = process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0"

        try {
          const supabase = await createClient()
          const password = generateDeterministicPassword(user.email, secret)

          // 1. Try to sign in to Supabase auth with deterministic password
          let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password,
          })

          if (signInError) {
            // 2. If sign in fails, the user might not exist in Supabase auth yet. Try signing up.
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: user.email,
              password,
            })

            if (signUpError) {
              console.error("Google login: Failed to auto-provision Supabase user auth:", signUpError.message)
              return false
            }

            // 3. Retry signing in to set session cookies
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password,
            })

            if (retryError) {
              console.error("Google login: Failed to sign in to auto-provisioned Supabase account:", retryError.message)
              return false
            }

            signInData = retryData
          }

          // Store the Supabase user ID inside the NextAuth user object for session/jwt callbacks
          if (signInData?.user) {
            user.id = signInData.user.id
          }
        } catch (err) {
          console.error("Google login: Unexpected error during Supabase sync:", err)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id as string
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
