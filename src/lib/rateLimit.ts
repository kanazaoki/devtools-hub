// Lightweight in-memory fixed-window rate limiter.
//
// NOTE: on serverless this is best-effort — state lives per warm instance, so a
// distributed attacker hitting many instances can exceed the limit. It still
// meaningfully throttles a single client hammering a warm instance and adds no
// dependencies. For strict global limits, back this with Vercel KV / Upstash.

interface Entry {
  count: number
  reset: number
}

const buckets = new Map<string, Entry>()

export interface RateLimitResult {
  ok: boolean
  retryAfter: number // seconds until the window resets
}

export function rateLimit(key: string, max = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now()

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
  }

  const entry = buckets.get(key)
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) }
  }
  entry.count++
  return { ok: true, retryAfter: 0 }
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
