// app/api/price-check/route.ts
// Background job: checks market price for a product and updates it in DB.
// Called AFTER product is already created — product is never blocked on this.
// Also called after a price edit.
//
// Fixes applied vs original:
//  [Fix 1] getCachedResult always recomputes isDeal/discountPercent from stored
//          marketPrice — never trusts stale flags in DB.
//  [Fix 2] Price-edit detection: if product.price changed since lastCheckedAt,
//          cache is bypassed and a fresh scrape is forced.
//  [Fix 3] Similar-product reuse only borrows marketPrice and recomputes deal
//          against THIS product's price, not the similar product's price.
//  [Fix 4] Scrapers run in parallel (Promise.all) — cuts worst-case from ~20s
//          to ~10s and gathers more data points for a better median.
//  [Fix 5] Retry wrapper: up to 3 attempts with exponential back-off so a
//          transient scraper failure never permanently buries a hot product.
//  [Fix 6] Scraper hardening: stricter timeouts, better HTML parsing, Jiji
//          price fields checked in correct priority order.
//  [Fix 7] No longer requires seller auth — internal calls (cron/backfill)
//          can also trigger this with an INTERNAL_SECRET header.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL_MS         = 12 * 60 * 60 * 1000  // 12 hours
const SIMILARITY_THRESHOLD = 0.80                   // keyword overlap for "similar product"
const MAX_RETRIES          = 3
const RETRY_BASE_MS        = 1_200                  // 1.2s → 2.4s → 4.8s
const MIN_DEAL_PERCENT     = 5                      // minimum % off to qualify as a deal
const INTERNAL_SECRET      = process.env.INTERNAL_API_SECRET || ''

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceResult {
  marketPrice:     number | null
  discountPercent: number | null
  isDeal:          boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

function buildSearchQuery(name: string, variants: string[], condition: string): string {
  // Strip common filler words that confuse search
  const cleanName  = name.replace(/\b(brand new|fairly used|uk used|tokunbo)\b/gi, '').trim()
  const variantStr = variants
    .filter(v => v.length > 1)
    .slice(0, 2)
    .join(' ')
  const base = `${cleanName} ${variantStr}`.trim()
  if (condition === 'USED') return `${base} price Nigeria used`
  return `${base} price Nigeria`
}

function detectCondition(variantValues: string[]): 'USED' | 'NEW' | 'REFURBISHED' {
  const all = variantValues.join(' ').toLowerCase()
  if (all.includes('used') || all.includes('fairly used') || all.includes('uk used') || all.includes('tokunbo')) return 'USED'
  if (all.includes('refurb')) return 'REFURBISHED'
  return 'NEW'
}

function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return isFinite(raw) && raw > 0 ? raw : null
  const cleaned = String(raw).replace(/[₦,\s]/g, '').replace(/[^\d.]/g, '')
  const num = parseFloat(cleaned)
  return isFinite(num) && num > 0 ? num : null
}

function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices
  const sorted = [...prices].sort((a, b) => a - b)
  const q1  = sorted[Math.floor(sorted.length * 0.25)]
  const q3  = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter(p => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr)
}

function median(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function isTitleRelevant(title: string, productName: string): boolean {
  const titleLower = title.toLowerCase()
  // Strip condition words before checking relevance
  const cleanName = productName.toLowerCase().replace(/\b(brand new|fairly used|uk used|tokunbo|refurbished|new)\b/g, '')
  const words = cleanName.split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return true
  const matchCount = words.filter(w => titleLower.includes(w)).length
  return matchCount >= Math.max(1, Math.floor(words.length * 0.4))
}

function nameSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s.toLowerCase()
     .replace(/\b(brand new|fairly used|uk used|tokunbo|refurbished|new)\b/g, '')
     .split(/\s+/)
     .filter(w => w.length > 2)
  const aWords = new Set(tokenize(a))
  const bWords = new Set(tokenize(b))
  if (aWords.size === 0 || bWords.size === 0) return 0
  let overlap = 0
  for (const w of aWords) if (bWords.has(w)) overlap++
  return overlap / Math.max(aWords.size, bWords.size)
}

/** Single source of truth for deal computation — always call this, never trust stored flags */
function computeDeal(price: number, marketPrice: number): PriceResult {
  if (price < marketPrice) {
    const discountPercent = Math.round(((marketPrice - price) / marketPrice) * 100)
    if (discountPercent >= MIN_DEAL_PERCENT) {
      return { marketPrice, discountPercent, isDeal: true }
    }
  }
  return { marketPrice, discountPercent: null, isDeal: false }
}

function extractVariantValues(description: string | null): string[] {
  if (!description) return []
  try {
    if (description.startsWith('VARIANTS_V2:')) {
      const json = JSON.parse(description.slice('VARIANTS_V2:'.length))
      return Object.values(json.variants || {}).flat() as string[]
    }
    // Fallback: try to pull condition keywords from plain description
    const conditionMatch = description.match(/\b(fairly used|uk used|tokunbo|brand new|refurbished)\b/i)
    if (conditionMatch) return [conditionMatch[1]]
  } catch { /* ignore */ }
  return []
}

// ── Cache check ───────────────────────────────────────────────────────────────

/**
 * Fix 1 + 2:
 * - Always recomputes deal from marketPrice using computeDeal()
 * - If price changed since last check, forces fresh scrape
 */
function getCachedResult(product: {
  price:            number
  priceAtLastCheck: number | null
  marketPrice:      number | null
  isDeal:           boolean
  lastCheckedAt:    Date | null
}): PriceResult | null {
  if (
    product.marketPrice !== null &&
    product.lastCheckedAt !== null &&
    Date.now() - new Date(product.lastCheckedAt).getTime() < CACHE_TTL_MS
  ) {
    // Fix 2: price was edited — bypass cache, force fresh scrape
    if (
      product.priceAtLastCheck !== null &&
      product.priceAtLastCheck !== product.price
    ) {
      return null
    }
    // Fix 1: recompute instead of trusting stored flags
    return computeDeal(product.price, product.marketPrice)
  }
  return null
}

// ── Similarity reuse ──────────────────────────────────────────────────────────

/**
 * Fix 3: Returns only the raw marketPrice from a similar product.
 * Caller must run computeDeal() against their own price.
 */
async function findSimilarMarketPrice(
  productId:    string,
  name:         string,
  category:     string,
  universityId: string | null,
): Promise<number | null> {
  try {
    const candidates = await prisma.product.findMany({
      where: {
        id:           { not: productId },
        category,
        universityId: universityId ?? undefined,
        marketPrice:  { not: null },
        lastCheckedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
        isDeleted:    false,
      },
      select: { name: true, marketPrice: true },
      take:   30,
    })

    // Find the best match above threshold
    let bestScore = 0
    let bestMarketPrice: number | null = null
    for (const c of candidates) {
      if (c.marketPrice === null) continue
      const sim = nameSimilarity(name, c.name)
      if (sim >= SIMILARITY_THRESHOLD && sim > bestScore) {
        bestScore = sim
        bestMarketPrice = c.marketPrice
      }
    }
    return bestMarketPrice
  } catch {
    return null
  }
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

/** Fix 6: Hardened Jiji scraper — checks all known price fields */
async function fetchJijiPrices(query: string, productName: string): Promise<number[]> {
  try {
    const encoded    = encodeURIComponent(query)
    const url        = `https://jiji.ng/api_web/v1/listing?query=${encoded}&init_page=true&page_param=1`
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), 9_000)

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/json',
        'Accept-Language': 'en-NG,en;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return []

    const json     = await res.json()
    const adverts: any[] = json?.adverts_list?.adverts || []
    const prices: number[] = []

    for (const ad of adverts) {
      const title = String(ad?.title || '')
      if (!isTitleRelevant(title, productName)) continue
      // Jiji has multiple price locations — check in priority order
      const rawPrice =
        ad?.price_obj?.value ??
        ad?.price_obj?.raw ??
        ad?.price ??
        null
      const price = parsePrice(rawPrice)
      if (price && price > 500 && price < 50_000_000) prices.push(price)
    }
    return prices
  } catch {
    return []
  }
}

/** Fix 6: Hardened Jumia scraper — handles both data-price attr and JSON-LD */
async function fetchJumiaPrices(query: string, productName: string): Promise<number[]> {
  try {
    const encoded    = encodeURIComponent(query)
    const url        = `https://www.jumia.com.ng/catalog/?q=${encoded}`
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), 11_000)

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml',
        'Accept-Language': 'en-NG,en;q=0.9',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return []

    const html   = await res.text()
    const prices: number[] = []

    // Strategy 1: data-price attributes (most reliable)
    for (const m of html.matchAll(/data-price="([\d.]+)"/g)) {
      const price = parsePrice(m[1])
      if (price && price > 500 && price < 50_000_000) prices.push(price)
    }

    // Strategy 2: article blocks with title + naira sign
    for (const articleMatch of html.matchAll(/<article[^>]*data-productid[^>]*>([\s\S]*?)<\/article>/g)) {
      const block = articleMatch[1]
      const nameMatch = block.match(/(?:title|aria-label)="([^"]+)"/)
      if (nameMatch && !isTitleRelevant(nameMatch[1], productName)) continue
      // Match ₦ or NGN prices
      for (const priceMatch of block.matchAll(/(?:₦|NGN\s?)([\d,]+)/g)) {
        const price = parsePrice(priceMatch[1])
        if (price && price > 500 && price < 50_000_000) prices.push(price)
      }
    }

    // Strategy 3: JSON-LD product schema
    for (const scriptMatch of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const schema = JSON.parse(scriptMatch[1])
        const items  = Array.isArray(schema) ? schema : [schema]
        for (const item of items) {
          const offerPrice = item?.offers?.price ?? item?.offer?.price
          if (offerPrice) {
            const price = parsePrice(offerPrice)
            if (price && price > 500 && price < 50_000_000) prices.push(price)
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    return prices
  } catch {
    return []
  }
}

async function fetchSerperPrices(query: string, productName: string): Promise<number[]> {
  try {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) return []

    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-API-KEY':    apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'ng', hl: 'en', num: 20 }),
    })
    clearTimeout(timer)
    if (!res.ok) return []

    const json     = await res.json()
    const results: any[] = json?.shopping || []
    const prices: number[] = []

    for (const item of results) {
      if (!isTitleRelevant(String(item?.title || ''), productName)) continue
      const price = parsePrice(String(item?.price || ''))
      if (price && price > 500 && price < 50_000_000) prices.push(price)
    }
    return prices
  } catch {
    return []
  }
}

// ── Core price check — Fix 4: parallel scrapers ───────────────────────────────

async function checkMarketPrice(
  name:          string,
  price:         number,
  variantValues: string[],
  category:      string,
): Promise<PriceResult> {
  const condition = detectCondition(variantValues)
  const query     = buildSearchQuery(name, variantValues, condition)

  try {
    // Fix 4: run primary scraper + Serper simultaneously
    const primaryFetch = condition === 'USED'
      ? fetchJijiPrices(query, name)
      : fetchJumiaPrices(query, name)

    const [primaryPrices, serperPrices] = await Promise.all([
      primaryFetch,
      fetchSerperPrices(query, name),
    ])

    // For NEW items, also try Jiji as an additional source
    let extraPrices: number[] = []
    if (condition === 'NEW' && primaryPrices.length < 3) {
      extraPrices = await fetchJijiPrices(query, name)
    }

    const allPrices = [...primaryPrices, ...serperPrices, ...extraPrices]

    if (allPrices.length < 2) {
      return { marketPrice: null, discountPercent: null, isDeal: false }
    }

    const cleaned = removeOutliers(allPrices)
    if (cleaned.length < 1) {
      return { marketPrice: null, discountPercent: null, isDeal: false }
    }

    const marketPrice = Math.round(median(cleaned))
    return computeDeal(price, marketPrice)
  } catch {
    return { marketPrice: null, discountPercent: null, isDeal: false }
  }
}

// ── Retry wrapper — Fix 5 ─────────────────────────────────────────────────────

async function checkMarketPriceWithRetry(
  name:          string,
  price:         number,
  variantValues: string[],
  category:      string,
): Promise<PriceResult> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1))  // 1.2s, 2.4s, 4.8s
    }
    const result = await checkMarketPrice(name, price, variantValues, category)
    if (result.marketPrice !== null) return result
  }
  return { marketPrice: null, discountPercent: null, isDeal: false }
}

// ── Core logic (shared between POST and internal backfill) ────────────────────

export async function runPriceCheck(productId: string, callerId?: string): Promise<{
  success: boolean
  source?: string
  result?: PriceResult
  error?: string
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id:               true,
      name:             true,
      price:            true,
      category:         true,
      description:      true,
      sellerId:         true,
      universityId:     true,
      marketPrice:      true,
      discountPercent:  true,
      isDeal:           true,
      lastCheckedAt:    true,
      priceAtLastCheck: true,
    },
  })

  if (!product) return { success: false, error: 'Product not found' }

  // Allow seller OR internal caller
  if (callerId && callerId !== product.sellerId && callerId !== 'internal') {
    return { success: false, error: 'Forbidden' }
  }

  // Step 1: cache check
  const cached = getCachedResult(product as any)
  if (cached) {
    // Silently fix DB if recomputed result differs (e.g. after price edit inside cache window)
    if (cached.isDeal !== product.isDeal || cached.discountPercent !== product.discountPercent) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          discountPercent:  cached.discountPercent,
          isDeal:           cached.isDeal,
          priceAtLastCheck: product.price,
        },
      })
    }
    return { success: true, source: 'cache', result: cached }
  }

  const variantValues = extractVariantValues(product.description)

  // Step 2: reuse a similar product's market price (Fix 3)
  const similarMarketPrice = await findSimilarMarketPrice(
    product.id,
    product.name,
    product.category,
    product.universityId,
  )

  if (similarMarketPrice !== null) {
    const result = computeDeal(product.price, similarMarketPrice)
    await prisma.product.update({
      where: { id: productId },
      data: {
        marketPrice:      similarMarketPrice,
        discountPercent:  result.discountPercent,
        isDeal:           result.isDeal,
        lastCheckedAt:    new Date(),
        priceAtLastCheck: product.price,
      },
    })
    return { success: true, source: 'similar', result }
  }

  // Step 3: live scrape with retry (Fix 4 + 5)
  const result = await checkMarketPriceWithRetry(
    product.name,
    product.price,
    variantValues,
    product.category,
  )

  await prisma.product.update({
    where: { id: productId },
    data: {
      marketPrice:      result.marketPrice,
      discountPercent:  result.discountPercent,
      isDeal:           result.isDeal,
      lastCheckedAt:    new Date(),
      priceAtLastCheck: product.price,
    },
  })

  return { success: true, source: 'live', result }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // Fix 7: allow internal calls (from backfill/cron) via secret header
    const internalHeader = request.headers.get('x-internal-secret')
    const isInternal = INTERNAL_SECRET && internalHeader === INTERNAL_SECRET

    let callerId: string | undefined
    if (!isInternal) {
      const user = await getUserFromRequest(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      callerId = user.id
    } else {
      callerId = 'internal'
    }

    const { success, source, result, error } = await runPriceCheck(productId, callerId)

    if (!success) {
      return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 404 })
    }

    return NextResponse.json({ success: true, source, ...result })
  } catch (error) {
    console.error('[price-check] error:', error)
    return NextResponse.json({
      success:         false,
      marketPrice:     null,
      discountPercent: null,
      isDeal:          false,
    })
  }
}