import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isMockAuthEnabled } from "@/lib/env";

// Single source of truth for "who is making this request" across all API
// routes. Checks demo mode, then NextAuth (Google), then Supabase
// (email/password + GitHub) — the same fallback order already used ad hoc
// across the app's server actions. Never trust a client-supplied user id.
//
// The demo branch is gated on isMockAuthEnabled(). `mockmate-demo-session` is
// an unsigned cookie that only client code ever writes; without that gate any
// visitor could set it from devtools and satisfy the `if (!userId) 401` check
// on every route that calls this. It is a local-development affordance, not an
// identity.
export async function getRequestUserId(): Promise<string | null> {
  if (isMockAuthEnabled()) {
    const cookieStore = await cookies();
    if (cookieStore.has("mockmate-demo-session")) {
      return "demo-user-id";
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
