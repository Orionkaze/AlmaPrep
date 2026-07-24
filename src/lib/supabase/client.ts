import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

interface LocalDemoUser {
  email: string
  password: string
  username: string
}

function readLocalDemoUsers(): LocalDemoUser[] {
  try {
    const stored = localStorage.getItem("mockmate_users");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// The demo-mode mock below is a table-agnostic localStorage/cookie-backed
// shim (it doesn't model per-table row shapes the way the real
// SupabaseClient does), so its structural type can't match SupabaseClient.
// Callers should still see the real client's type — that's what the
// `as unknown as SupabaseClient` cast at the end of this factory is for.
function createMockBrowserClient(): SupabaseClient {
  return {
    auth: {
      signUp: async ({ email, password }: { email: string; password: string }) => {
        console.log("Mock Supabase Client: signUp", email);

        const users = readLocalDemoUsers();

        if (users.some((u) => u.email === email)) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }

        const newUser = { email, password, username: email.split("@")[0] };
        users.push(newUser);
        localStorage.setItem("mockmate_users", JSON.stringify(users));

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        const expires = "; expires=" + expiry.toUTCString();
        document.cookie = "mockmate-demo-session=true; path=/" + expires;
        document.cookie = "mockmate-demo-user=" + encodeURIComponent(JSON.stringify({ email, username: email.split("@")[0] })) + "; path=/" + expires;

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

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log("Mock Supabase Client: signInWithPassword", email);

        const users = readLocalDemoUsers();

        let user = users.find((u) => u.email === email);
        if (!user) {
          // Auto-register to make testing simple and flawless
          user = { email, password, username: email.split("@")[0] };
          users.push(user);
          localStorage.setItem("mockmate_users", JSON.stringify(users));
        } else if (user.password !== password) {
          return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        const expires = "; expires=" + expiry.toUTCString();
        document.cookie = "mockmate-demo-session=true; path=/" + expires;
        document.cookie = "mockmate-demo-user=" + encodeURIComponent(JSON.stringify({ email, username: user.username })) + "; path=/" + expires;

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
        console.log("Mock Supabase Client: signOut");
        document.cookie = "mockmate-demo-session=; path=/; max-age=0";
        document.cookie = "mockmate-demo-user=; path=/; max-age=0";
        return { error: null };
      },

      getUser: async () => {
        const matches = document.cookie.match(new RegExp('(^| )mockmate-demo-user=([^;]+)'));
        if (matches) {
          try {
            const parsed = JSON.parse(decodeURIComponent(matches[2]));
            return { data: { user: { id: "demo-user-id", email: parsed.email } }, error: null };
          } catch {}
        }
        return { data: { user: null }, error: null };
      },

      getSession: async () => {
        const matches = document.cookie.match(new RegExp('(^| )mockmate-demo-user=([^;]+)'));
        if (matches) {
          try {
            const parsed = JSON.parse(decodeURIComponent(matches[2]));
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
          } catch {}
        }
        return { data: { session: null }, error: null };
      }
    },
    from: (table: string) => {
      console.log(`Mock Supabase Client: from(${table})`);
      const chain = {
        select: () => chain,
        insert: () => chain,
        update: () => chain,
        upsert: () => chain,
        delete: () => chain,
        eq: () => chain,
        single: async () => {
          if (table === "users") {
            const matches = document.cookie.match(new RegExp('(^| )mockmate-demo-user=([^;]+)'));
            if (matches) {
              try {
                const parsed = JSON.parse(decodeURIComponent(matches[2]));
                return {
                  data: {
                    id: "demo-user-id",
                    username: parsed.username || parsed.email?.split("@")[0] || "User",
                    avatar_url: parsed.avatar_url || "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              } catch {}
            }
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => {
          if (table === "users") {
            const matches = document.cookie.match(new RegExp('(^| )mockmate-demo-user=([^;]+)'));
            if (matches) {
              try {
                const parsed = JSON.parse(decodeURIComponent(matches[2]));
                return {
                  data: {
                    id: "demo-user-id",
                    username: parsed.username || parsed.email?.split("@")[0] || "User",
                    avatar_url: parsed.avatar_url || "user-tie",
                    subscription_tier: "free"
                  },
                  error: null
                };
              } catch {}
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

export function createClient(): SupabaseClient {
  const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-supabase-project-id.supabase.co");

  if (isMockMode) {
    return createMockBrowserClient();
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: false
      }
    }
  )
}

