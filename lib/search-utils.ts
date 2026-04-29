export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function keywordMatchScore(productText: string, keyword: string): number {
  const normalizedProduct = normalizeText(productText)
  const normalizedKeyword = normalizeText(keyword)
  if (!normalizedProduct || !normalizedKeyword) return 0

  if (normalizedProduct === normalizedKeyword) return 1
  if (normalizedProduct.includes(normalizedKeyword)) return 0.7

  const keywordTokens = normalizedKeyword.split(' ').filter(Boolean)
  const productTokens = new Set(normalizedProduct.split(' ').filter(Boolean))
  if (!keywordTokens.length || !productTokens.size) return 0

  const overlap = keywordTokens.filter((token) => productTokens.has(token)).length
  if (overlap === 0) return 0
  const ratio = overlap / keywordTokens.length
  if (ratio >= 1) return 0.7
  if (ratio >= 0.5) return 0.4
  return 0.2
}

