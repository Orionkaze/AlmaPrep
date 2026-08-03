import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { signJWT, verifyJWT } from '@/lib/jwt'
import { getAuthSecret, isMockAuthEnabled } from '@/lib/env'

type MockCredentials = { email: string; password?: string }
type MockUser = { id: string; email?: string }
type MockSession = { access_token: string; expires_in: number; user: MockUser }

/**
 * Fake Supabase client for local development without a project.
 *
 * It accepts ANY email/password pair and mints a session, so reaching it is
 * equivalent to disabling authentication. createClient() below therefore only
 * returns it behind isMockAuthEnabled(), which is hard-disabled in production.
 */
async function createMockServerClient() {
  const cookieStore = await cookies()
  const secret = getAuthSecret()

  return {
    auth: {
      signUp: async ({ email }: MockCredentials) => {
        const username = email.split("@")[0];
        const payload = {
          userId: "demo-user-id",
          email,
          username,
          exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
        };
        const token = await signJWT(payload, secret);

        cookieStore.set("mockmate-mock-session", token, { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username }), { path: "/", maxAge: 604800 });
        
        const mockUser = { id: "demo-user-id", email, email_confirmed_at: new Date().toISOString() };
        return {
          data: {
            user: mockUser,
            session: {
              access_token: "mock-session-token",
              expires_in: 3600,
              user: mockUser,
            }
          },
          error: null
        };
      },

      signInWithPassword: async ({ email }: MockCredentials) => {
        const username = email.split("@")[0];
        const payload = {
          userId: "demo-user-id",
          email,
          username,
          exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
        };
        const token = await signJWT(payload, secret);

        cookieStore.set("mockmate-mock-session", token, { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username }), { path: "/", maxAge: 604800 });
        
        const mockUser = { id: "demo-user-id", email, email_confirmed_at: new Date().toISOString() };
        return {
          data: {
            user: mockUser,
            session: {
              access_token: "mock-session-token",
              expires_in: 3600,
              user: mockUser,
            }
          },
          error: null
        };
      },

      signOut: async () => {
        cookieStore.delete("mockmate-mock-session");
        cookieStore.delete("mockmate-demo-user");
        return { error: null };
      },

      getUser: async () => {
        const token = cookieStore.get("mockmate-mock-session")?.value;
        if (token) {
          const payload = await verifyJWT(token, secret);
          if (payload) {
            return { data: { user: { id: payload.userId || "demo-user-id", email: payload.email } }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      },

      getSession: async () => {
        const token = cookieStore.get("mockmate-mock-session")?.value;
        if (token) {
          const payload = await verifyJWT(token, secret);
          if (payload) {
            const mockUser = { id: payload.userId || "demo-user-id", email: payload.email };
            return {
              data: {
                session: {
                  access_token: "mock-session-token",
                  expires_in: 3600,
                  user: mockUser,
                }
              },
              error: null
            };
          }
        }
        return { data: { session: null }, error: null };
      },
      onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
        const token = cookieStore.get("mockmate-mock-session")?.value;
        if (token) {
          verifyJWT(token, secret).then((payload) => {
            if (payload) {
              const mockUser = { id: payload.userId || "demo-user-id", email: payload.email };
              const session = { access_token: "mock-session-token", expires_in: 3600, user: mockUser };
              callback("SIGNED_IN", session);
            } else {
              callback("SIGNED_OUT", null);
            }
          }).catch(() => {
            callback("SIGNED_OUT", null);
          });
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {}
            }
          }
        };
      },

      signInWithOAuth: async ({ provider }: { provider: string }) => {
        const mockUser = { id: "demo-user-id", email: "demo@mockmate.com" };
        const payload = {
          userId: "demo-user-id",
          email: mockUser.email,
          username: "demo_user",
          exp: Math.floor(Date.now() / 1000) + 604800,
        };
        const token = await signJWT(payload, secret);
        cookieStore.set("mockmate-mock-session", token, { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email: mockUser.email, username: "demo_user" }), { path: "/", maxAge: 604800 });
        return { data: { provider, url: "/dashboard" }, error: null };
      },

      exchangeCodeForSession: async () => {
        const mockUser = { id: "demo-user-id", email: "demo@mockmate.com" };
        const payload = {
          userId: "demo-user-id",
          email: mockUser.email,
          username: "demo_user",
          exp: Math.floor(Date.now() / 1000) + 604800,
        };
        const token = await signJWT(payload, secret);
        cookieStore.set("mockmate-mock-session", token, { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email: mockUser.email, username: "demo_user" }), { path: "/", maxAge: 604800 });
        const session = { access_token: "mock-session-token", expires_in: 3600, user: mockUser };
        return { data: { user: mockUser, session }, error: null };
      },

      resetPasswordForEmail: async () => {
        return { data: {}, error: null };
      },

      updateUser: async (attributes: Record<string, unknown> & { email?: string }) => {
        const mockUser = { id: "demo-user-id", email: attributes.email || "demo@mockmate.com", ...attributes };
        return { data: { user: mockUser }, error: null };
      }
    },
    from: (table: string) => {
      const chain = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        upsert: () => chain,
        delete: () => chain,
        eq: () => chain,
        single: async () => {
          if (table === "users") {
            const token = cookieStore.get("mockmate-mock-session")?.value;
            if (token) {
              const payload = await verifyJWT(token, secret);
              if (payload) {
                return {
                  data: {
                    id: "demo-user-id",
                    username: payload.username || payload.email?.split("@")[0] || "User",
                    avatar_url: "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              }
            }
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => {
          if (table === "users") {
            const token = cookieStore.get("mockmate-mock-session")?.value;
            if (token) {
              const payload = await verifyJWT(token, secret);
              if (payload) {
                return {
                  data: {
                    id: "demo-user-id",
                    username: payload.username || payload.email?.split("@")[0] || "User",
                    avatar_url: "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              }
            }
          }
          return { data: null, error: null };
        },
        limit: () => chain,
        order: () => chain,
      };
      return chain;
    }
  } as unknown as SupabaseClient;
}

export async function createClient() {
  if (isMockAuthEnabled()) {
    return createMockServerClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Fail loudly. The previous behaviour was to silently substitute the mock
    // client here, which turns a missing env var into "every password works".
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Set them, or set NEXT_PUBLIC_MOCK_AUTH=true for local development."
    )
  }

  const cookieStore = await cookies()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

