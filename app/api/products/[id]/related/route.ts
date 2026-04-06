// app/api/products/[id]/related/route.ts
// Smart related products — prioritises same-name keywords, then same category,
// then same seller, filling remainder with popular university-wide products.
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// Extract meaningful keywords from a product name by removing common noise words
function extractKeywords(name: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'to',
    'with', 'by', 'from', 'up', 'as', 'into', 'through', 'is', 'it',
    'its', 'this', 'that', 'my', 'your', 'our',
  ])
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w))
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.universityId) {
      return NextResponse.json({ error: 'No university on account' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(4, parseInt(searchParams.get('limit') || '12')))

    // Fetch the source product
    const source = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        category: true,
        sellerId: true,
        price: true,
        universityId: true,
      },
    })

    if (!source) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Safety: only show products from same university
    if (source.universityId !== user.universityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const keywords = extractKeywords(source.name)

    // Fetch candidate products from the same university (exclude the source product and out-of-stock)
    const candidates = await prisma.product.findMany({
      where: {
        id:           { not: params.id },
        isActive:     true,
        isDeleted:    false,
        quantity:     { gt: 0 },
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
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // score from a reasonable pool
    })

    // Score each candidate
    const scored = candidates.map(p => {
      let score = 0

      const pNameLower = p.name.toLowerCase()
      const pCatLower  = p.category.toLowerCase()
      const srcCatLower = source.category.toLowerCase()

      // ── 1. Name-keyword overlap (strongest signal) ──────────────────────
      // Count how many keywords from the source name appear in the candidate name
      let kwMatches = 0
      for (const kw of keywords) {
        if (pNameLower.includes(kw)) kwMatches++
      }
      // Bonus: candidate keywords also appear in source name
      const pKws = extractKeywords(p.name)
      for (const kw of pKws) {
        if (source.name.toLowerCase().includes(kw)) kwMatches += 0.5
      }
      score += kwMatches * 40 // heavily weighted

      // ── 2. Exact name prefix match (e.g. "iPhone 13" matches "iPhone 14") ─
      const srcFirstWord = keywords[0] || ''
      if (srcFirstWord && pNameLower.startsWith(srcFirstWord)) score += 30

      // ── 3. Same category ────────────────────────────────────────────────
      if (p.category === source.category) score += 20

      // ── 4. Category keyword overlap ─────────────────────────────────────
      const srcCatKws = extractKeywords(source.category)
      for (const kw of srcCatKws) {
        if (pCatLower.includes(kw)) score += 5
      }

      // ── 5. Same seller (show more from the same shop) ───────────────────
      if (p.sellerId === source.sellerId) score += 10

      // ── 6. Similar price range (within ±50%) ────────────────────────────
      const priceDiff = Math.abs(p.price - source.price) / source.price
      if (priceDiff <= 0.5) score += 5

      // ── 7. Popularity ───────────────────────────────────────────────────
      score += Math.min(10, (p._count.orders || 0) * 2)
      score += Math.min(5, (p.viewCount || 0) / 10)

      // ── 8. Seller trust ─────────────────────────────────────────────────
      if (p.seller?.trustLevel === 'GOLD')   score += 4
      if (p.seller?.trustLevel === 'SILVER') score += 2

      return { product: p, score, kwMatches }
    })

    // Sort: products with at least one keyword match first (by score),
    // then others by popularity so the section never looks empty
    scored.sort((a, b) => {
      if (a.kwMatches > 0 && b.kwMatches === 0) return -1
      if (a.kwMatches === 0 && b.kwMatches > 0) return 1
      return b.score - a.score
    })

    // Take the top N and annotate them with a "relevanceLabel" for the UI
    const results = scored.slice(0, limit).map(({ product, kwMatches, score }) => ({
      ...product,
      _relevanceScore: Math.round(score),
      _isNameRelated:  kwMatches > 0,
    }))

    // Separate into "name-related" (primary) and "you-might-also-like" (secondary)
    const nameRelated = results.filter(p => p._isNameRelated)
    const others      = results.filter(p => !p._isNameRelated)

    return NextResponse.json({
      success: true,
      sourceProduct: {
        id: source.id,
        name: source.name,
        category: source.category,
        keywords,
      },
      related: {
        nameRelated,   // Products sharing name keywords (e.g. other "iPhone" items)
        others,        // Same-category / popular fill
      },
      total: results.length,
    })
  } catch (error) {
    console.error('Related products error:', error)
    return NextResponse.json({ error: 'Failed to fetch related products' }, { status: 500 })
  }
}