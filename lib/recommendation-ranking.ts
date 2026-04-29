export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function logNormalize(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 0
  return clamp01(Math.log1p(value) / Math.log1p(maxValue))
}

export function recencyNormalize(createdAt: Date | string | number, nowMs = Date.now()): number {
  const ts = new Date(createdAt).getTime()
  if (!Number.isFinite(ts)) return 0
  const hours = Math.max(0, (nowMs - ts) / 3600000)
  return Math.exp(-hours / 72)
}

export function priceSimilarityScore(a: number, b: number): number {
  const pa = Number(a || 0)
  const pb = Number(b || 0)
  if (pa <= 0 || pb <= 0) return 0
  const diffRatio = Math.abs(pa - pb) / Math.max(pa, pb)
  return clamp01(1 - diffRatio)
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  const sa = new Set((a || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean))
  const sb = new Set((b || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean))
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const v of sa) if (sb.has(v)) inter++
  const union = sa.size + sb.size - inter
  if (union === 0) return 0
  return inter / union
}

export function computeHybridRecommendationScore(context: {
  coViewScore: number
  attributeSimilarity: number
  sessionMatch: number
  popularity: number
  priceSimilarity: number
  recency: number
}): number {
  return (
    0.35 * clamp01(context.coViewScore) +
    0.25 * clamp01(context.attributeSimilarity) +
    0.15 * clamp01(context.sessionMatch) +
    0.1 * clamp01(context.popularity) +
    0.1 * clamp01(context.priceSimilarity) +
    0.05 * clamp01(context.recency)
  )
}

