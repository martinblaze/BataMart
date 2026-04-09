// app/api/price-check/route.ts
// Background job: checks market price for a product and updates it in DB.
// Called AFTER product is already created — product is never blocked on this.
//
// Flow:
//  1. Check cache (marketPrice + lastCheckedAt on product, TTL = 12 hours)
//  2. Check similar products in DB and reuse their market price
//  3. Try Jumia (NEW/REFURBISHED) or Jiji (USED) scraping
//  4. Fallback to Serper API only if steps 1–3 all fail
//  5. Save result to DB
//  6. Return result

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const SIMILARITY_THRESHOLD = 0.85         // 85% keyword overlap for "similar"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceResult {
  marketPrice: number | null
  discountPercent: number | null
  isDeal: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pause execution briefly between requests */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

/** Build a clean search query from product data */
function buildSearchQuery(name: string, variants: string[], condition: string): string {
  const variantStr = variants.slice(0, 3).join(' ')
  return `${name} ${variantStr} ${condition} price Nigeria`.trim()
}

/** Detect condition from variant/tag strings */
function detectCondition(variantValues: string[]): 'USED' | 'NEW' | 'REFURBISHED' {
  const all = variantValues.join(' ').toLowerCase()
  if (all.includes('used') || all.includes('fairly used') || all.includes('uk used')) return 'USED'
  if (all.includes('refurb')) return 'REFURBISHED'
  return 'NEW'
}

/** Parse a price string into a number, returns null if unparseable */
function parsePrice(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[₦,\s]/g, '').replace(/[^\d.]/g, '')
  const num = parseFloat(cleaned)
  return isFinite(num) && num > 0 ? num : null
}

/** Remove statistical outliers using IQR method */
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices
  const sorted = [...prices].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr)
}

/** Calculate median of an array of numbers */
function median(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/** Check if a result title is relevant to the product name */
function isTitleRelevant(title: string, productName: string): boolean {
  const titleLower = title.toLowerCase()
  const words = productName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const matchCount = words.filter(w => titleLower.includes(w)).length
  return matchCount >= Math.max(1, Math.floor(words.length * 0.4))
}

/**
 * Compute keyword similarity ratio between two product names.
 * Returns a value between 0 (no overlap) and 1 (identical keywords).
 */
function nameSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const aWords = new Set(tokenize(a))
  const bWords = new Set(tokenize(b))
  if (aWords.size === 0 || bWords.size === 0) return 0
  let overlap = 0
  for (const w of aWords) if (bWords.has(w)) overlap++
  return overlap / Math.max(aWords.size, bWords.size)
}

/** Compute a discount and isDeal flag given a price and market price */
function computeDeal(price: number, marketPrice: number): PriceResult {
  if (price < marketPrice) {
    const discountPercent = Math.round(((marketPrice - price) / marketPrice) * 100)
    if (discountPercent >= 5) {
      return { marketPrice, discountPercent, isDeal: true }
    }
  }
  return { marketPrice, discountPercent: null, isDeal: false }
}

// ── Cache check ───────────────────────────────────────────────────────────────

/**
 * Returns cached PriceResult if the product already has a fresh market price.
 * "Fresh" = lastCheckedAt is within the last 12 hours.
 */
function getCachedResult(product: {
  price: number
  marketPrice: number | null
  discountPercent: number | null
  isDeal: boolean
  lastCheckedAt: Date | null
}): PriceResult | null {
  if (
    product.marketPrice !== null &&
    product.lastCheckedAt !== null &&
    Date.now() - new Date(product.lastCheckedAt).getTime() < CACHE_TTL_MS
  ) {
    return {
      marketPrice: product.marketPrice,
      discountPercent: product.discountPercent,
      isDeal: product.isDeal,
    }
  }
  return null
}

// ── Similarity reuse ──────────────────────────────────────────────────────────

/**
 * Looks for another product in the same university + category with a
 * fresh market price and similar name. Returns its market price if found.
 */
async function findSimilarProductPrice(
  productId: string,
  name: string,
  category: string,
  price: number,
  universityId: string | null,
): Promise<PriceResult | null> {
  try {
    // Fetch recent products in same category with a valid market price
    const candidates = await prisma.product.findMany({
      where: {
        id: { not: productId },
        category,
        universityId: universityId ?? undefined,
        marketPrice: { not: null },
        lastCheckedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
        isDeleted: false,
      },
      select: {
        name: true,
        marketPrice: true,
        discountPercent: true,
        isDeal: true,
        lastCheckedAt: true,
      },
      take: 20,
    })

    for (const c of candidates) {
      if (c.marketPrice === null) continue
      const sim = nameSimilarity(name, c.name)
      if (sim >= SIMILARITY_THRESHOLD) {
        // Reuse market price but recalculate deal against this product's price
        return computeDeal(price, c.marketPrice)
      }
    }
    return null
  } catch {
    return null
  }
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

/** Fetch prices from Jiji.ng (for USED items). */
async function fetchJijiPrices(query: string, productName: string): Promise<number[]> {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://jiji.ng/api_web/v1/listing?query=${encoded}&init_page=true`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BataMart/1.0)',
        Accept: 'application/json',
      },
    })
    clearTimeout(timer)

    if (!res.ok) return []
    const json = await res.json()

    const adverts: any[] = json?.adverts_list?.adverts || []
    const prices: number[] = []

    for (const ad of adverts) {
      const title = ad?.title || ''
      const priceRaw = String(ad?.price_obj?.value || ad?.price || '')
      if (!isTitleRelevant(title, productName)) continue
      const price = parsePrice(priceRaw)
      if (price && price > 500) prices.push(price)
    }

    return prices
  } catch {
    return []
  }
}

/** Fetch prices from Jumia Nigeria (for NEW / REFURBISHED items). */
async function fetchJumiaPrices(query: string, productName: string): Promise<number[]> {
  try {
    const encoded = encodeURIComponent(query)
    const url = `https://www.jumia.com.ng/catalog/?q=${encoded}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BataMart/1.0)',
        Accept: 'text/html',
      },
    })
    clearTimeout(timer)

    if (!res.ok) return []
    const html = await res.text()
    const prices: number[] = []

    const dataPriceMatches = html.matchAll(/data-price="([\d.]+)"/g)
    for (const m of dataPriceMatches) {
      const price = parsePrice(m[1])
      if (price && price > 500) prices.push(price)
    }

    const articleMatches = html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)
    for (const articleMatch of articleMatches) {
      const block = articleMatch[1]
      const nameMatch = block.match(/title="([^"]+)"/)
      if (nameMatch && !isTitleRelevant(nameMatch[1], productName)) continue
      const priceMatch = block.match(/[\u20a6]([\d,]+)/)
      if (priceMatch) {
        const price = parsePrice(priceMatch[1])
        if (price && price > 500) prices.push(price)
      }
    }

    return prices
  } catch {
    return []
  }
}

/**
 * Fallback: Serper Google Shopping API.
 * Only called when:
 *  - No cached result exists
 *  - No similar product found
 *  - Jumia/Jiji scraping returned < 2 prices
 */
async function fetchSerperPrices(query: string, productName: string): Promise<number[]> {
  try {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) return []

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'ng', hl: 'en', num: 20 }),
    })
    clearTimeout(timer)

    if (!res.ok) return []
    const json = await res.json()

    const results: any[] = json?.shopping || []
    const prices: number[] = []

    for (const item of results) {
      const title = item?.title || ''
      if (!isTitleRelevant(title, productName)) continue
      // Serper returns price as a string like "₦45,000" or a number
      const priceRaw = String(item?.price || '')
      const price = parsePrice(priceRaw)
      if (price && price > 500) prices.push(price)
    }

    return prices
  } catch {
    return []
  }
}

// ── Core price check function ─────────────────────────────────────────────────

async function checkMarketPrice(
  name: string,
  price: number,
  variantValues: string[],
  category: string,
): Promise<PriceResult> {
  const condition = detectCondition(variantValues)
  const query = buildSearchQuery(name, variantValues, condition)

  let prices: number[] = []

  try {
    // Step 1: Primary scraper based on condition
    if (condition === 'USED') {
      prices = await fetchJijiPrices(query, name)
    } else {
      prices = await fetchJumiaPrices(query, name)
    }

    await delay(300)

    // Step 2: Fallback to Serper ONLY if scraping failed
    if (prices.length < 2) {
      const serperPrices = await fetchSerperPrices(query, name)
      prices = [...prices, ...serperPrices]
    }

    // Step 3: Not enough data
    if (prices.length < 2) {
      return { marketPrice: null, discountPercent: null, isDeal: false }
    }

    const cleaned = removeOutliers(prices)
    if (cleaned.length < 1) {
      return { marketPrice: null, discountPercent: null, isDeal: false }
    }

    const marketPrice = Math.round(median(cleaned))
    return computeDeal(price, marketPrice)
  } catch {
    return { marketPrice: null, discountPercent: null, isDeal: false }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/price-check
 * Body: { productId }
 * Called in background after product creation.
 * Updates product with marketPrice, discountPercent, isDeal, lastCheckedAt.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // Fetch the product — include cache fields
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
        subcategory: true,
        description: true,
        sellerId: true,
        universityId: true,
        marketPrice: true,
        discountPercent: true,
        isDeal: true,
        lastCheckedAt: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Security: only the seller can trigger price check for their product
    if (product.sellerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Step 1: Return cached result if still fresh ───────────────────────────
    const cached = getCachedResult(product as any)
    if (cached) {
      return NextResponse.json({ success: true, source: 'cache', ...cached })
    }

    // ── Extract variant values ────────────────────────────────────────────────
    let variantValues: string[] = []
    try {
      if (product.description?.startsWith('VARIANTS_V2:')) {
        const json = JSON.parse(product.description.slice('VARIANTS_V2:'.length))
        variantValues = Object.values(json.variants || {}).flat() as string[]
      }
    } catch {
      // ignore parse errors
    }

    // ── Step 2: Reuse similar product's market price ──────────────────────────
    const similar = await findSimilarProductPrice(
      product.id,
      product.name,
      product.category,
      product.price,
      product.universityId,
    )

    if (similar && similar.marketPrice !== null) {
      // Save the reused result so future checks hit the cache
      await prisma.product.update({
        where: { id: productId },
        data: {
          marketPrice: similar.marketPrice,
          discountPercent: similar.discountPercent,
          isDeal: similar.isDeal,
          lastCheckedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, source: 'similar', ...similar })
    }

    // ── Steps 3–4: Scrape Jumia/Jiji, fallback to Serper ─────────────────────
    const result = await checkMarketPrice(
      product.name,
      product.price,
      variantValues,
      product.category,
    )

    // ── Step 5: Save result (even null, so we record the attempt time) ────────
    await prisma.product.update({
      where: { id: productId },
      data: {
        marketPrice: result.marketPrice,
        discountPercent: result.discountPercent,
        isDeal: result.isDeal,
        lastCheckedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, source: 'live', ...result })
  } catch (error) {
    console.error('Price check error:', error)
    // Never throw — always return a safe response
    return NextResponse.json({
      success: false,
      marketPrice: null,
      discountPercent: null,
      isDeal: false,
    })
  }
}