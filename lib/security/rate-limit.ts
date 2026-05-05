type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export function getIpKey(raw: string | null | undefined): string {
  if (!raw) return 'unknown'
  return raw.split(',')[0].trim() || 'unknown'
}

export function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSecs: 0 }
  }
  if (bucket.count >= max) {
    return { allowed: false, retryAfterSecs: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count += 1
  return { allowed: true, retryAfterSecs: 0 }
}

export async function checkRateLimitDistributed(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSecs: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return checkRateLimit(key, max, windowMs)
  }

  try {
    const url = `${UPSTASH_URL}/pipeline`
    const ttlSecs = Math.max(1, Math.ceil(windowMs / 1000))
    const body = JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, ttlSecs],
      ['TTL', key],
    ])
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    })
    if (!res.ok) return checkRateLimit(key, max, windowMs)

    const data = await res.json()
    const count = Number(data?.[0]?.result ?? 0)
    const ttl = Number(data?.[2]?.result ?? ttlSecs)
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      return checkRateLimit(key, max, windowMs)
    }

    if (count > max) {
      return { allowed: false, retryAfterSecs: Math.max(1, ttl) }
    }
    return { allowed: true, retryAfterSecs: 0 }
  } catch {
    return checkRateLimit(key, max, windowMs)
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets.entries()) {
    if (now > v.resetAt) buckets.delete(k)
  }
}, 60_000)
