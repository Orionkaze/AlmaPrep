import { Redis } from "@upstash/redis"

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

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

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

/**
 * Convenience wrapper over {@link rateLimit} with inverted semantics.
 * Checks Redis first if configured; falls back to in-memory rate limiting.
 * @returns true if the key is OVER the limit (i.e. the request should be
 * rejected), false if it is still within the allowance.
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (redis) {
    try {
      const now = Date.now()
      const cutoff = now - windowMs
      const redisKey = `ratelimit:${key}`
      const member = `${now}:${Math.random()}`

      const p = redis.pipeline()
      p.zremrangebyscore(redisKey, 0, cutoff)
      p.zadd(redisKey, { score: now, member })
      p.zcard(redisKey)
      p.pexpire(redisKey, windowMs)

      const results = await p.exec()
      const card = results[2] as number

      if (card > limit) {
        // Over the limit. Remove the added member asynchronously to keep the ZSET accurate.
        redis.zrem(redisKey, member).catch((err) => {
          console.error(`Failed to remove rate limit member from Redis for key ${redisKey}:`, err)
        })
        return true
      }
      return false
    } catch (err) {
      console.error(`Redis rate limiting failed for key ${key}, falling back to in-memory:`, err)
    }
  }

  return !rateLimit(key, limit, windowMs, Date.now())
}