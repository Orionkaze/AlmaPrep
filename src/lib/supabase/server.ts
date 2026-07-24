import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { signJWT, verifyJWT } from '@/lib/jwt'

async function createMockServerClient() {
  const cookieStore = await cookies()
  const secret = process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0"

  return {
    auth: {
      signUp: async ({ email, password }: any) => {
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

      signInWithPassword: async ({ email, password }: any) => {
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
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
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

      signInWithOAuth: async ({ provider }: any) => {
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

      exchangeCodeForSession: async (code: string) => {
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

      resetPasswordForEmail: async (email: string) => {
        return { data: {}, error: null };
      },

      updateUser: async (attributes: any) => {
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
      return chain as any;
    }
  } as any;
}

export async function createClient() {
  const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-supabase-project-id.supabase.co") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz.supabase.co");

  if (isMockMode) {
    return createMockServerClient();
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

