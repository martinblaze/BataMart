// app/api/products/feed/route.ts
// Personalized product feed — TikTok-style scoring based on:
//   1. Categories the user has ordered from (strongest signal)
//   2. Categories the user has recently viewed (sent from client via query param)
//   3. Categories the user has searched (sent from client via query param)
//   4. Overall product popularity (viewCount + order count)
//   5. Recency (newer products get a small boost)
//   6. Seller trust level (GOLD > SILVER > BRONZE)
// Products are scored, shuffled within score bands, then returned.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

const PAGE_SIZE = 40

// Score weights — tweak these to change feed feel
const W = {
  ordered:      100,  // user has ordered this category before
  viewed:        60,  // user has viewed products in this category
  searched:      40,  // user has searched for this category / keyword
  popular:       20,  // high viewCount
  orderCount:    15,  // many orders on the product
  sellerGold:    10,  // seller trust level bonus
  sellerSilver:   5,
  recency:       10,  // product listed within last 7 days
  newish:         5,  // product listed within last 30 days
}

function trustScore(level: string) {
  if (level === 'GOLD')   return W.sellerGold
  if (level === 'SILVER') return W.sellerSilver
  return 0
}

function recencyScore(createdAt: Date) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays <= 7)  return W.recency
  if (ageDays <= 30) return W.newish
  return 0
}

// Normalise a raw count to 0-maxScore using sqrt dampening (so one product
// with 1000 views doesn't completely bury everything else).
function normalisedCount(count: number, maxPossible: number, maxScore: number) {
  if (!count || !maxPossible) return 0
  return (Math.sqrt(count) / Math.sqrt(maxPossible)) * maxScore
}

// Add a small random jitter so products with identical scores shuffle
function jitter() {
  return Math.random() * 3 - 1.5 // ±1.5 points
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.universityId) {
      return NextResponse.json({ error: 'No university on account' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

    // ── Signals sent from the client (localStorage data) ─────────────────────
    // viewed: comma-separated category names from recently viewed products
    // searched: comma-separated recent search terms
    const viewedRaw   = searchParams.get('viewed')   || ''
    const searchedRaw = searchParams.get('searched')  || ''

    const viewedCategories  = viewedRaw.split(',').map(s => s.trim()).filter(Boolean)
    const searchedTerms     = searchedRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    // ── 1. Pull the user's order history to get their category preferences ───
    const userOrders = await prisma.order.findMany({
      where: { buyerId: user.id },
      select: { product: { select: { category: true } } },
      take: 100,
      orderBy: { orderedAt: 'desc' },
    })

    const orderedCategories = new Set(
      userOrders.map(o => o.product?.category).filter(Boolean) as string[]
    )

    // ── 2. Fetch all active in-stock products for this university ─────────────
    const allProducts = await prisma.product.findMany({
      where: {
        isActive:     true,
        quantity:     { gt: 0 },
        isDeleted:    false,
        universityId: user.universityId,
      },
      include: {
        seller: {
          select: {
            id:              true,
            name:            true,
            avgRating:       true,
            trustLevel:      true,
            completedOrders: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    })

    if (!allProducts.length) {
      return NextResponse.json({ success: true, products: [], total: 0, page, hasMore: false })
    }

    // ── 3. Find max counts for normalisation ──────────────────────────────────
    const maxViewCount  = Math.max(...allProducts.map(p => p.viewCount || 0), 1)
    const maxOrderCount = Math.max(...allProducts.map(p => p._count.orders || 0), 1)

    // ── 4. Score every product ────────────────────────────────────────────────
    const scored = allProducts.map(product => {
      let score = 0

      const cat = product.category

      // Order history signal (strongest)
      if (orderedCategories.has(cat)) score += W.ordered

      // Recently viewed signal
      if (viewedCategories.includes(cat)) score += W.viewed

      // Search signal — check if any search term matches category or product name
      for (const term of searchedTerms) {
        if (
          cat.toLowerCase().includes(term) ||
          product.name.toLowerCase().includes(term)
        ) {
          score += W.searched
          break // don't double-count
        }
      }

      // Popularity signals
      score += normalisedCount(product.viewCount || 0, maxViewCount,  W.popular)
      score += normalisedCount(product._count.orders || 0, maxOrderCount, W.orderCount)

      // Seller trust
      score += trustScore(product.seller?.trustLevel || 'BRONZE')

      // Recency
      score += recencyScore(product.createdAt)

      // Small jitter to keep the feed feeling fresh on each load
      score += jitter()

      return { product, score }
    })

    // ── 5. Sort by score descending ───────────────────────────────────────────
    scored.sort((a, b) => b.score - a.score)

    // ── 6. Paginate ───────────────────────────────────────────────────────────
    const total   = scored.length
    const skip    = (page - 1) * PAGE_SIZE
    const pageItems = scored.slice(skip, skip + PAGE_SIZE)

    // ── 7. Annotate with feed metadata (real signals, not random) ─────────────
    const now = Date.now()
    const products = pageItems.map(({ product, score }) => {
      const ageDays = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      const isPersonalised = orderedCategories.has(product.category) || viewedCategories.includes(product.category)
      return {
        ...product,
        _feedScore:       Math.round(score),
        isNew:            ageDays <= 7,
        isTrending:       (product._count.orders >= 3) || (product.viewCount >= 20),
        isPersonalised,   // used by UI to show "For You" badge
      }
    })

    return NextResponse.json({
      success: true,
      products,
      total,
      page,
      pages:   Math.ceil(total / PAGE_SIZE),
      hasMore: skip + pageItems.length < total,
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 })
  }
}