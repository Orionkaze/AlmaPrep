import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createMockServerClient() {
  const cookieStore = await cookies()

  return {
    auth: {
      signUp: async ({ email, password }: any) => {
        cookieStore.set("mockmate-demo-session", "true", { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username: email.split("@")[0] }), { path: "/", maxAge: 604800 });
        
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
        cookieStore.set("mockmate-demo-session", "true", { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username: email.split("@")[0] }), { path: "/", maxAge: 604800 });
        
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
        cookieStore.delete("mockmate-demo-session");
        cookieStore.delete("mockmate-demo-user");
        return { error: null };
      },

      getUser: async () => {
        const demoUserVal = cookieStore.get("mockmate-demo-user")?.value;
        if (demoUserVal) {
          try {
            const parsed = JSON.parse(demoUserVal);
            return { data: { user: { id: "demo-user-id", email: parsed.email } }, error: null };
          } catch (e) {}
        }
        return { data: { user: null }, error: null };
      },

      getSession: async () => {
        const demoUserVal = cookieStore.get("mockmate-demo-user")?.value;
        if (demoUserVal) {
          try {
            const parsed = JSON.parse(demoUserVal);
            const mockUser = { id: "demo-user-id", email: parsed.email };
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
          } catch (e) {}
        }
        return { data: { session: null }, error: null };
      }
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        const demoUserVal = cookieStore.get("mockmate-demo-user")?.value;
        let session: any = null;
        if (demoUserVal) {
          try {
            const parsed = JSON.parse(demoUserVal);
            const mockUser = { id: "demo-user-id", email: parsed.email };
            session = { access_token: "mock-session-token", expires_in: 3600, user: mockUser };
          } catch (e) {}
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
        cookieStore.set("mockmate-demo-session", "true", { path: "/", maxAge: 604800 });
        cookieStore.set("mockmate-demo-user", JSON.stringify({ email: mockUser.email, username: "demo_user" }), { path: "/", maxAge: 604800 });
        return { data: { provider, url: "/dashboard" }, error: null };
      },

      exchangeCodeForSession: async (code: string) => {
        const mockUser = { id: "demo-user-id", email: "demo@mockmate.com" };
        cookieStore.set("mockmate-demo-session", "true", { path: "/", maxAge: 604800 });
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
            const demoUserVal = cookieStore.get("mockmate-demo-user")?.value;
            if (demoUserVal) {
              try {
                const parsed = JSON.parse(demoUserVal);
                return {
                  data: {
                    id: "demo-user-id",
                    username: parsed.username || parsed.email?.split("@")[0] || "User",
                    avatar_url: parsed.avatar_url || "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              } catch (e) {}
            }
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => {
          if (table === "users") {
            const demoUserVal = cookieStore.get("mockmate-demo-user")?.value;
            if (demoUserVal) {
              try {
                const parsed = JSON.parse(demoUserVal);
                return {
                  data: {
                    id: "demo-user-id",
                    username: parsed.username || parsed.email?.split("@")[0] || "User",
                    avatar_url: parsed.avatar_url || "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              } catch (e) {}
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

