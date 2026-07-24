// Sliding-window rate limiter with two backends.
//
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
// enforced in Upstash Redis — authoritative and shared across every serverless
// invocation / instance. This is the production-correct path: an in-memory Map
// resets per isolate on Vercel, so it does NOT actually cap anything in a
// serverless deployment (the reason this was rewritten).
//
// When those env vars are absent (local dev, or before Upstash is provisioned),
// it falls back to the old in-memory Map so nothing breaks — just understand
// that fallback is best-effort friction, not a real limit.
//
// isRateLimited is async now; all callers must await it.
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── In-memory fallback ──────────────────────────────────────────────────────
const buckets = new Map<string, number[]>();

function isRateLimitedMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  return false;
}

// ── Upstash sliding window (sorted set) ─────────────────────────────────────
// One ZSET per key holding request timestamps. Each check drops entries older
// than the window, counts what's left, and (if under the limit) records this
// request. TTL keeps abandoned keys from lingering.
async function isRateLimitedRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipe = redis!.pipeline();
  pipe.zremrangebyscore(redisKey, 0, windowStart);
  pipe.zcard(redisKey);
  const results = await pipe.exec<[number, number]>();
  const count = results[1] ?? 0;

  if (count >= limit) {
    return true;
  }

  // Member must be unique within the window; timestamp + jitter avoids collisions
  // when two requests land in the same millisecond.
  const member = `${now}-${Math.floor(now % 1000)}-${count}`;
  const writePipe = redis!.pipeline();
  writePipe.zadd(redisKey, { score: now, member });
  writePipe.pexpire(redisKey, windowMs);
  await writePipe.exec();

  return false;
}

/**
 * Returns true if `key` has already hit `limit` requests within `windowMs`.
 * Records the current request when it is allowed.
 *
 * On any Redis error we fail OPEN (allow the request) rather than block real
 * users because the limiter backend hiccuped — availability over strictness for
 * this friction layer. The abuse ceiling is still the per-user auth + cost caps.
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (!redis) {
    return isRateLimitedMemory(key, limit, windowMs);
  }
  try {
    return await isRateLimitedRedis(key, limit, windowMs);
  } catch (err) {
    console.error("[rateLimit] Upstash error, falling back to in-memory:", err);
    return isRateLimitedMemory(key, limit, windowMs);
  }
}
