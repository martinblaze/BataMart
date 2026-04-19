// lib/marketPrice/engine.ts
//
// Hot/deal engine:
// - Early stage: views drive "hot"
// - With sales: confirmed sales drive market-price comparisons
// - Matching bucket: name + condition + changed-parts + variant fingerprint

import { prisma } from '@/lib/prisma'
import { decodeProductDataServer } from '@/lib/variants'

const HOT_VIEW_THRESHOLD = 15
const MIN_DEAL_PERCENT = 5
const MIN_SALES_FOR_PRICE_MODE = 1
const MAX_MARKET_PRICE_AGE_DAYS = 180

const PRICE_SENSITIVE_VARIANT_KEYS = new Set([
  'brand',
  'model',
  'storage',
  'ram',
  'processor',
  'screen',
  'size',
  'year',
  'platform',
  'type',
  'capacity',
  'bundle',
])

export function normaliseProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(apple|samsung|xiaomi|tecno|infinix|itel|oppo|vivo|realme|oneplus|huawei|nokia|motorola|lg|sony)\b/g, '')
    .replace(/\b(brand new|fairly used|uk used|tokunbo|refurbished|sealed|open box|complete pack)\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractCondition(variantValues: string[], description: string): {
  condition: 'NEW' | 'USED' | 'REFURBISHED'
  hasChangedParts: boolean
} {
  const text = [...variantValues, description].join(' ').toLowerCase()

  const hasChangedParts =
    text.includes('screen changed') ||
    text.includes('screen replaced') ||
    text.includes('battery changed') ||
    text.includes('battery replaced') ||
    text.includes('body changed') ||
    text.includes('part changed') ||
    text.includes('changed screen') ||
    text.includes('replaced screen')

  let condition: 'NEW' | 'USED' | 'REFURBISHED' = 'NEW'
  if (
    text.includes('fairly used') ||
    text.includes('uk used') ||
    text.includes('tokunbo') ||
    (text.includes('used') && !text.includes('unused'))
  ) {
    condition = 'USED'
  } else if (text.includes('refurb')) {
    condition = 'REFURBISHED'
  }

  return { condition, hasChangedParts }
}

function normaliseToken(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractImplicitSpecs(text: string): string[] {
  const out: string[] = []
  const t = text.toLowerCase()

  const storageMatches = t.match(/\b(\d+)\s?(tb|gb)\b/g) || []
  for (const m of storageMatches) out.push(`storage:${normaliseToken(m)}`)

  const ramMatches = t.match(/\b(\d+)\s?gb\s?ram\b/g) || []
  for (const m of ramMatches) out.push(`ram:${normaliseToken(m)}`)

  const modelHints = t.match(/\b(iphone\s?\d{1,2}(?:\s?(?:pro|max|plus|mini))?)\b/g) || []
  for (const m of modelHints) out.push(`model:${normaliseToken(m)}`)

  return out
}

export function extractVariantValues(description: string | null): string[] {
  if (!description) return []
  const { variants } = decodeProductDataServer(description)
  if (!variants || typeof variants !== 'object') return []
  return Object.values(variants).flat().map(v => String(v))
}

export function buildVariantKeyFromDescription(description: string | null, name: string): string | null {
  const { variants } = decodeProductDataServer(description || '')
  const parts: string[] = []

  for (const [key, values] of Object.entries(variants || {})) {
    const k = normaliseToken(key)
    if (!PRICE_SENSITIVE_VARIANT_KEYS.has(k)) continue
    for (const raw of values || []) {
      const v = normaliseToken(String(raw))
      if (!v) continue
      parts.push(`${k}:${v}`)
    }
  }

  const implicit = extractImplicitSpecs(`${name} ${description || ''}`)
  for (const p of implicit) parts.push(p)

  const uniqueSorted = [...new Set(parts)].sort()
  return uniqueSorted.length > 0 ? uniqueSorted.join('|') : null
}

export interface MarketPriceLookup {
  marketPrice: number | null
  confirmedSales: number
  hasEnoughData: boolean
}

export async function getMarketPrice(
  nameKey: string,
  condition: string,
  hasChangedParts: boolean,
  category: string,
  variantKey: string | null,
): Promise<MarketPriceLookup> {
  const cutoffDate = new Date(Date.now() - MAX_MARKET_PRICE_AGE_DAYS * 24 * 60 * 60 * 1000)

  if (variantKey) {
    const exact = await prisma.marketPrice.findMany({
      where: {
        nameKey,
        condition,
        hasChangedParts,
        variantKey,
        recordedAt: { gte: cutoffDate },
      },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    })

    if (exact.length > 0) {
      return {
        marketPrice: exact[0].confirmedPrice,
        confirmedSales: exact.length,
        hasEnoughData: exact.length >= MIN_SALES_FOR_PRICE_MODE,
      }
    }
  }

  const records = await prisma.marketPrice.findMany({
    where: {
      nameKey,
      condition,
      hasChangedParts,
      recordedAt: { gte: cutoffDate },
    },
    orderBy: { recordedAt: 'desc' },
    take: 10,
  })

  if (records.length === 0) {
    const looseRecords = await prisma.marketPrice.findMany({
      where: {
        nameKey,
        category,
        recordedAt: { gte: cutoffDate },
      },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    })

    return {
      marketPrice: looseRecords.length > 0 ? looseRecords[0].confirmedPrice : null,
      confirmedSales: looseRecords.length,
      hasEnoughData: looseRecords.length >= MIN_SALES_FOR_PRICE_MODE,
    }
  }

  return {
    marketPrice: records[0].confirmedPrice,
    confirmedSales: records.length,
    hasEnoughData: records.length >= MIN_SALES_FOR_PRICE_MODE,
  }
}

export function computeDeal(price: number, marketPrice: number): {
  isDeal: boolean
  discountPercent: number | null
} {
  if (price < marketPrice) {
    const pct = Math.round(((marketPrice - price) / marketPrice) * 100)
    if (pct >= MIN_DEAL_PERCENT) {
      return { isDeal: true, discountPercent: pct }
    }
  }
  return { isDeal: false, discountPercent: null }
}

export interface HotResult {
  isHot: boolean
  hotReason: 'VIEWS' | 'DEAL' | 'BOTH' | null
  isDeal: boolean
  discountPercent: number | null
  marketPrice: number | null
}

export async function evaluateHot(productId: string): Promise<HotResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      description: true,
      viewCount: true,
      nameKey: true,
      variantKey: true,
      conditionType: true,
      hasChangedParts: true,
      createdAt: true,
    },
  })

  if (!product) {
    return { isHot: false, hotReason: null, isDeal: false, discountPercent: null, marketPrice: null }
  }

  const variantValues = extractVariantValues(product.description)
  const nameKey = product.nameKey || normaliseProductName(product.name)
  const variantKey = product.variantKey || buildVariantKeyFromDescription(product.description, product.name)
  const { condition, hasChangedParts } = product.conditionType
    ? { condition: product.conditionType as 'NEW' | 'USED' | 'REFURBISHED', hasChangedParts: product.hasChangedParts }
    : extractCondition(variantValues, product.description || '')

  const productAgeDays = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  const viewsPerDay = product.viewCount / Math.max(productAgeDays, 1)
  const isHotByViews = product.viewCount >= HOT_VIEW_THRESHOLD || viewsPerDay >= 3

  const { marketPrice, hasEnoughData } = await getMarketPrice(
    nameKey,
    condition,
    hasChangedParts,
    product.category,
    variantKey,
  )

  let isDeal = false
  let discountPercent: number | null = null

  if (hasEnoughData && marketPrice !== null) {
    const deal = computeDeal(product.price, marketPrice)
    isDeal = deal.isDeal
    discountPercent = deal.discountPercent
  }

  const isHot = isHotByViews || isDeal
  let hotReason: 'VIEWS' | 'DEAL' | 'BOTH' | null = null
  if (isHotByViews && isDeal) hotReason = 'BOTH'
  else if (isHotByViews) hotReason = 'VIEWS'
  else if (isDeal) hotReason = 'DEAL'

  return { isHot, hotReason, isDeal, discountPercent, marketPrice }
}

export async function saveHotResult(productId: string, result: HotResult): Promise<void> {
  await prisma.product.update({
    where: { id: productId },
    data: {
      isHot: result.isHot,
      hotReason: result.hotReason,
      isDeal: result.isDeal,
      discountPercent: result.discountPercent,
      marketPrice: result.marketPrice,
    },
  })
}

export async function updateHotStatus(productId: string): Promise<HotResult> {
  const result = await evaluateHot(productId)
  await saveHotResult(productId, result)
  return result
}
