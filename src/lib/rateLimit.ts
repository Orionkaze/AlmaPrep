/**
 * Minimal in-memory sliding-window rate limiter. No dependency, no external
 * store.
 *
 * CAVEAT: state is per-process and resets on cold start. On serverless this is
 * best-effort, not a guarantee — good enough for a low-volume contact form
 * plus a honeypot and timing check. If real abuse appears, move to a durable
 * store (a DB table or Upstash). A DB-backed limit was avoided here because it
 * needs query methods the repo's mock Supabase client does not implement.
 */

const hits = new Map<string, number[]>()

/**
 * @returns true if allowed, false if the key is over the limit.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): boolean {
  const cutoff = now - windowMs
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff)

  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }

  recent.push(now)
  hits.set(key, recent)

  // Opportunistic prune so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      const live = times.filter((t) => t > cutoff)
      if (live.length === 0) hits.delete(k)
      else hits.set(k, live)
    }
  }

  return true
}