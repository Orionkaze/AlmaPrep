import { getCurrentUser } from "@/lib/getCurrentUser";

/**
 * Who is making this request, as a bare id.
 *
 * This used to walk its own auth ladder — demo cookie, then NextAuth, then
 * Supabase — while getCurrentUser() walked a different one: demo cookie, then
 * Supabase, then NextAuth. Two functions, each documented as the single source
 * of truth for identity, disagreeing about precedence and about when the demo
 * cookie counts. That disagreement was the bug: getCurrentUser gated the
 * unsigned `mockmate-demo-session` cookie behind mock mode and this one did
 * not, so every route below accepted a cookie any visitor could set from
 * devtools.
 *
 * There is one ladder now. Precedence no longer matters for correctness
 * either: the NextAuth signIn callback in lib/auth.ts assigns the Supabase user
 * id onto the token, so both paths resolve to the same id for the same person.
 *
 * Never trust a client-supplied user id.
 */
export async function getRequestUserId(): Promise<string | null> {
  const { userId } = await getCurrentUser();
  return userId;
}
