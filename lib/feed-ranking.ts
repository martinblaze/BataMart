type SellerTier = 'GOLD' | 'SILVER' | 'BRONZE' | string

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function sellerTierScore(level?: SellerTier | null): number {
  if (level === 'GOLD') return 1
  if (level === 'SILVER') return 0.7
  return 0.4
}

export function recencyScore(createdAt: Date | string | number, nowMs = Date.now()): number {
  const createdMs = new Date(createdAt).getTime()
  if (!Number.isFinite(createdMs)) return 0
  const hours = Math.max(0, (nowMs - createdMs) / 3600000)
  return Math.exp(-hours / 72)
}

export function decayWeight(timestamp?: number | null, nowMs = Date.now()): number {
  if (!timestamp || !Number.isFinite(timestamp)) return 0
  const hours = Math.max(0, (nowMs - timestamp) / 3600000)
  return Math.exp(-hours / 24)
}

export function popularityScore(viewCount: number, orderCount: number, maxPopularityLog: number): number {
  const views = Math.max(0, viewCount || 0)
  const orders = Math.max(0, orderCount || 0)
  const value = Math.log1p(views + orders)
  if (!maxPopularityLog || maxPopularityLog <= 0) return 0
  return clamp01(value / maxPopularityLog)
}

export function computeFeedScore(context: {
  categoryMatch: number
  keywordMatch: number
  recencyScore: number
  popularityScore: number
  sellerTierScore: number
}): number {
  const {
    categoryMatch,
    keywordMatch,
    recencyScore: recency,
    popularityScore: popularity,
    sellerTierScore: sellerTier,
  } = context

  return (
    0.3 * clamp01(categoryMatch) +
    0.2 * clamp01(keywordMatch) +
    0.2 * clamp01(recency) +
    0.2 * clamp01(popularity) +
    0.1 * clamp01(sellerTier)
  )
}

