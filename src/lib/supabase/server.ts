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
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-supabase-project-id.supabase.co");

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

