import 'server-only'

/**
 * Small fixed-window rate limiter for public form submissions.
 *
 * Deliberately in-process: it needs no extra infrastructure and stops the
 * obvious case - one script hammering the inquiry form. It is per instance, so
 * on a multi-instance deployment the effective limit is (limit × instances).
 * If abuse ever becomes a real problem, swap the Map for a shared store; the
 * call sites do not change.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Stops the Map growing without bound on a long-running server. */
function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  existing.count += 1
  const allowed = existing.count <= limit

  return {
    allowed,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  }
}

/**
 * Best-effort client identity from proxy headers.
 *
 * These headers are attacker-controllable in principle, which is why the limit
 * is a speed bump rather than a security control - validation and RLS are what
 * actually protect the data.
 */
export function clientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || headers.get('x-real-ip') || headers.get('cf-connecting-ip') || 'unknown'
  return `${scope}:${ip}`
}
