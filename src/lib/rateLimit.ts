import { Redis } from "@upstash/redis"

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  reset: number // UTC epoch in seconds
  retryAfter: number // Seconds to wait
}

/**
 * Abuse ceilings per user, keyed by the prefix of the rate-limit key
 * ("interview:<userId>" resolves to `interview`).
 *
 * These are NOT product limits — the paywall in config/plans.ts owns those.
 * Each number is sized well above what a person doing back-to-back interviews
 * generates, so it only ever catches a script. A single interview costs roughly
 * 10 `interview` calls and 20 `answer-analysis` calls.
 *
 * NOTE: login/signup/forgot-password used to be listed here, which implied a
 * protection that did not exist — the browser calls Supabase Auth directly, so
 * no request reaches this server and nothing ever read those keys. Brute-force
 * protection for those flows is Supabase's own; configure it there.
 */
export const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  interview: { limit: 60, windowMs: 60 * 60 * 1000 },
  "answer-analysis": { limit: 120, windowMs: 60 * 60 * 1000 },
  feedback: { limit: 10, windowMs: 60 * 60 * 1000 },
  coding: { limit: 20, windowMs: 60 * 60 * 1000 },
  "github-analysis": { limit: 5, windowMs: 60 * 60 * 1000 },
  "resume-analysis": { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  chat: { limit: 50, windowMs: 60 * 60 * 1000 },
}

/**
 * key -> { hit timestamps, the window those timestamps belong to }.
 *
 * The window is stored per key because the opportunistic prune below walks the
 * whole map: pruning every key with the *calling* key's cutoff would drop
 * still-live hits for longer windows (one 60-second call would wipe the 24-hour
 * `resume-analysis` history), silently resetting those limits.
 */
const hits = new Map<string, { times: number[]; windowMs: number }>()

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

let lastLoggedErrorTime = 0
const LOG_ERROR_THROTTLE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Throttle logging of Redis connection errors to prevent log flooding.
 */
function logRedisError(message: string, error: unknown): void {
  const now = Date.now()
  if (now - lastLoggedErrorTime > LOG_ERROR_THROTTLE_MS) {
    lastLoggedErrorTime = now
    console.error(message, error)
  }
}

/**
 * Helper to resolve the correct RateLimitConfig using custom configs, key prefixes, or environment defaults.
 */
function resolveConfig(key: string, config?: string | RateLimitConfig): RateLimitConfig {
  if (config) {
    if (typeof config === "string") {
      const endpointConfig = ENDPOINT_CONFIGS[config]
      if (endpointConfig) {
        return endpointConfig
      }
    } else {
      return config
    }
  }

  // Parse prefix from key (e.g. key is "login:user@example.com", prefix is "login")
  const prefix = key.split(":")[0]
  const endpointConfig = ENDPOINT_CONFIGS[prefix]
  if (endpointConfig) {
    return endpointConfig
  }

  // Fallback to environment variables or defaults
  const envLimit = process.env.RATE_LIMIT_MAX_REQUESTS
  const envWindow = process.env.RATE_LIMIT_WINDOW_MS

  return {
    limit: envLimit ? parseInt(envLimit, 10) : 20,
    windowMs: envWindow ? parseInt(envWindow, 10) : 60000,
  }
}

/**
 * In-memory sliding-window rate limiter (fallback).
 */
function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const cutoff = now - windowMs
  const recent = (hits.get(key)?.times ?? []).filter((t) => t > cutoff)

  if (recent.length >= limit) {
    const oldestTimestamp = recent[0] ?? now
    const resetMs = oldestTimestamp + windowMs
    return {
      allowed: false,
      remaining: 0,
      limit,
      reset: Math.ceil(resetMs / 1000),
      retryAfter: Math.max(0, Math.ceil((resetMs - now) / 1000)),
    }
  }

  recent.push(now)
  hits.set(key, { times: recent, windowMs })

  // Opportunistic prune so the map cannot grow without bound. Each entry is
  // pruned against its own window, not the calling key's.
  if (hits.size > 5000) {
    for (const [k, entry] of hits) {
      const live = entry.times.filter((t) => t > now - entry.windowMs)
      if (live.length === 0) hits.delete(k)
      else hits.set(k, { times: live, windowMs: entry.windowMs })
    }
  }

  const oldestTimestamp = recent[0] ?? now
  const resetMs = oldestTimestamp + windowMs

  return {
    allowed: true,
    remaining: Math.max(0, limit - recent.length),
    limit,
    reset: Math.ceil(resetMs / 1000),
    retryAfter: 0,
  }
}

/**
 * Core rate limit checker.
 *
 * Implements a sliding-window rate limiter using Redis Sorted Sets (ZSET) if Upstash Redis
 * environment variables are available. If Redis is unavailable or fails, it falls back
 * to an in-memory sliding-window rate limiter.
 *
 * Redis Data Structure:
 * - Key: `ratelimit:${key}`
 * - Type: Sorted Set (ZSET)
 * - Score: Timestamp of request (milliseconds since Unix epoch)
 * - Member: `${timestamp}:${Math.random()}` (to ensure uniqueness of concurrent requests)
 *
 * Pipeline Operations:
 * 1. ZREMRANGEBYSCORE: Remove all entries older than (now - windowMs).
 * 2. ZADD: Add the current request's timestamp-encoded member to the set.
 * 3. ZCARD: Get the total number of members in the set within the active sliding window.
 * 4. ZRANGE: Fetch the oldest member in the set to determine window reset time.
 * 5. PEXPIRE: Set/renew TTL on the set.
 *
 * Cleanup Logic:
 * If the request exceeds the limit, the added member is asynchronously removed (ZREM) to prevent
 * failed requests from artificially extending the rate-limit window.
 *
 * Fallback Behavior:
 * Gracefully falls back to a sliding-window in-memory rate limiter using a Javascript Map on failure.
 *
 * @param key The rate limit identifier key.
 * @param config Optional endpoint name (from registry) or direct RateLimitConfig object.
 * @returns RateLimitResult containing limit, remaining, reset, allowed, and retryAfter details.
 */
export async function checkRateLimit(
  key: string,
  config?: string | RateLimitConfig
): Promise<RateLimitResult> {
  const resolvedConfig = resolveConfig(key, config)
  const { limit, windowMs } = resolvedConfig

  if (redis) {
    const now = Date.now()
    const cutoff = now - windowMs
    const redisKey = `ratelimit:${key}`
    const member = `${now}:${Math.random()}`

    try {
      const p = redis.pipeline()
      p.zremrangebyscore(redisKey, 0, cutoff)
      p.zadd(redisKey, { score: now, member })
      p.zcard(redisKey)
      p.zrange(redisKey, 0, 0)
      p.pexpire(redisKey, windowMs)

      const results = await p.exec()
      const card = results[2] as number
      const zrangeResult = results[3] as string[]

      let oldestTimestamp = now
      if (Array.isArray(zrangeResult) && zrangeResult.length > 0) {
        const parts = zrangeResult[0].split(":")
        const parsed = parseInt(parts[0], 10)
        if (!isNaN(parsed)) {
          oldestTimestamp = parsed
        }
      }

      const allowed = card <= limit
      const remaining = Math.max(0, limit - card)
      const resetMs = oldestTimestamp + windowMs
      const reset = Math.ceil(resetMs / 1000)
      const retryAfter = allowed ? 0 : Math.max(0, Math.ceil((resetMs - now) / 1000))

      if (!allowed) {
        // Asynchronously remove member if request was rejected to keep sliding window accurate.
        redis.zrem(redisKey, member).catch((err) => {
          logRedisError(`Failed to remove rejected rate limit member for key ${redisKey}:`, err)
        })
      }

      return {
        allowed,
        remaining,
        limit,
        reset,
        retryAfter,
      }
    } catch (err) {
      logRedisError(`Redis rate limiting failed for key ${key}, falling back to in-memory:`, err)
    }
  }

  // Fallback to in-memory rate limiting
  return rateLimitInMemory(key, limit, windowMs, Date.now())
}

/**
 * Synchronous in-memory rate limiter.
 * Included for backward compatibility (e.g. contact actions).
 *
 * @returns true if allowed, false if key is over the limit.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): boolean {
  return rateLimitInMemory(key, limit, windowMs, now).allowed
}

/**
 * Convenience wrapper over checkRateLimit with inverted semantics.
 * Included for backward compatibility in standard API routes.
 *
 * @returns true if the key is OVER the limit (i.e. blocked), false if allowed.
 */
export async function isRateLimited(
  key: string,
  limit?: number,
  windowMs?: number
): Promise<boolean> {
  const config = limit !== undefined && windowMs !== undefined
    ? { limit, windowMs }
    : undefined
  const result = await checkRateLimit(key, config)
  return !result.allowed
}

/**
 * Utility to format standard rate limit HTTP headers.
 *
 * Provides:
 * - X-RateLimit-Limit: Maximum requests allowed in the window.
 * - X-RateLimit-Remaining: Remaining requests allowed in the current window.
 * - X-RateLimit-Reset: Epoch time in seconds when the window completely resets.
 * - Retry-After: Seconds to wait before retrying (only returned if request was rejected).
 *
 * @param result The result returned from checkRateLimit.
 * @returns A plain object containing standard rate limit headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  }
  if (!result.allowed && result.retryAfter > 0) {
    headers["Retry-After"] = String(result.retryAfter)
  }
  return headers
}

