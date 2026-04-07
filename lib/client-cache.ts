type CacheRecord<T> = {
  value: T
  expiresAt: number
  savedAt: number
}

export function setClientCache<T>(key: string, value: T, ttlMs: number) {
  if (typeof window === 'undefined') return
  try {
    const now = Date.now()
    const record: CacheRecord<T> = {
      value,
      savedAt: now,
      expiresAt: now + ttlMs,
    }
    localStorage.setItem(key, JSON.stringify(record))
  } catch {}
}

export function getClientCache<T>(key: string): { value: T; isExpired: boolean; savedAt: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheRecord<T>
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) return null
    return {
      value: parsed.value,
      isExpired: Date.now() > Number(parsed.expiresAt || 0),
      savedAt: Number(parsed.savedAt || 0),
    }
  } catch {
    return null
  }
}

export function clearClientCache(key: string) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(key) } catch {}
}
