export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { normalizeText, keywordMatchScore } from '@/lib/search-utils'
import {
  computeHybridRecommendationScore,
  jaccardSimilarity,
  logNormalize,
  priceSimilarityScore,
  recencyNormalize,
} from '@/lib/recommendation-ranking'

function applyDiversity<T extends { sellerId: string; categoryKey?: string | null; category: string }>(items: T[]): T[] {
  const bySeller = new Map<string, number>()
  const byCategory = new Map<string, number>()
  const out: T[] = []
  for (const item of items) {
    const sellerCount = bySeller.get(item.sellerId) || 0
    const cat = item.categoryKey || normalizeText(item.category)
    const categoryCount = byCategory.get(cat) || 0
    if (sellerCount >= 3) continue
    if (categoryCount >= 8) continue
    out.push(item)
    bySeller.set(item.sellerId, sellerCount + 1)
    byCategory.set(cat, categoryCount + 1)
  }
  return out
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.universityId) return NextResponse.json({ error: 'No university on account' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.min(30, Math.max(4, Number(searchParams.get('limit') || 12)))
    const othersOnly = searchParams.get('othersOnly') === 'true'
    const gridMode = searchParams.get('gridMode') === 'true'

    const source = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        category: true,
        categoryKey: true,
        sellerId: true,
        price: true,
        universityId: true,
        attributeValues: { select: { key: true, value: true } },
      },
    })
    if (!source) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (source.universityId !== user.universityId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const [coViews, candidates, sessionEvents] = await Promise.all([
      prisma.productCoView.findMany({
        where: { productId: source.id },
        select: { relatedProductId: true, count: true },
        orderBy: { count: 'desc' },
        take: 200,
      }),
      prisma.product.findMany({
        where: {
          id: { not: source.id },
          isActive: true,
          isDeleted: false,
          quantity: { gt: 0 },
          universityId: user.universityId,
        },
        select: {
          id: true,
          name: true,
          price: true,
          images: true,
          category: true,
          categoryKey: true,
          sellerId: true,
          viewCount: true,
          createdAt: true,
          seller: { select: { id: true, name: true, avgRating: true, trustLevel: true, completedOrders: true } },
          _count: { select: { orders: true } },
          attributeValues: { select: { key: true, value: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 250,
      }),
      prisma.userSessionEvent.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          OR: [{ userId: user.id }, { sessionId: searchParams.get('sessionId') || undefined }],
        },
        select: { productId: true, eventType: true, meta: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 120,
      }),
    ])

    const maxCoView = Math.max(...coViews.map((c) => c.count), 1)
    const maxPopularity = Math.max(...candidates.map((c) => (c.viewCount || 0) + (c._count?.orders || 0)), 1)
    const sourceAttrTokens = source.attributeValues.flatMap((a) => {
      const v = Array.isArray(a.value) ? a.value.map(String) : [String(a.value ?? '')]
      return [`${a.key}:${v.join('|')}`]
    })
    const sessionProductIds = new Set(sessionEvents.map((e) => e.productId).filter(Boolean) as string[])
    const sessionSearchTokens = sessionEvents
      .filter((e) => e.eventType === 'search')
      .flatMap((e) => {
        const q = e.meta && typeof e.meta === 'object' ? (e.meta as Record<string, unknown>).query : ''
        return typeof q === 'string' ? q.split(/\s+/).filter(Boolean).map(normalizeText) : []
      })

    const coViewMap = new Map(coViews.map((c) => [c.relatedProductId, c.count]))
    const sourceName = normalizeText(source.name)

    const scored = candidates.map((p) => {
      const cov = coViewMap.get(p.id) || 0
      const coViewScore = logNormalize(cov, maxCoView)
      const pAttrTokens = p.attributeValues.flatMap((a) => {
        const v = Array.isArray(a.value) ? a.value.map(String) : [String(a.value ?? '')]
        return [`${a.key}:${v.join('|')}`]
      })
      const attributeSimilarity = jaccardSimilarity(sourceAttrTokens, pAttrTokens)
      const keywordMatch = keywordMatchScore(`${p.name} ${p.category}`, sourceName)
      const priceSimilarity = priceSimilarityScore(source.price, p.price)
      const recency = recencyNormalize(p.createdAt)
      const popularity = logNormalize((p.viewCount || 0) + (p._count?.orders || 0), maxPopularity)

      let sessionMatch = 0
      if (sessionProductIds.has(p.id)) sessionMatch += 0.6
      const pName = normalizeText(p.name)
      if (sessionSearchTokens.some((t) => t && pName.includes(t))) sessionMatch += 0.4
      sessionMatch = Math.min(1, sessionMatch)

      const score = computeHybridRecommendationScore({
        coViewScore,
        attributeSimilarity,
        sessionMatch,
        popularity,
        priceSimilarity,
        recency,
      })

      return {
        ...p,
        _score: score,
        _coViewScore: coViewScore,
        _isNameRelated: keywordMatch >= 0.4,
      }
    })

    const ranked = applyDiversity(scored.sort((a, b) => b._score - a._score))
    const nameRelated = ranked.filter((r) => r._isNameRelated)
    const others = ranked.filter((r) => !r._isNameRelated)
    const full = [...nameRelated, ...others]

    const targetList = othersOnly ? others : gridMode ? full : full
    const total = targetList.length
    const start = (page - 1) * limit
    const items = targetList.slice(start, start + limit)

    return NextResponse.json({
      success: true,
      sourceProduct: { id: source.id, name: source.name, category: source.category },
      items,
      page,
      total,
      hasMore: start + limit < total,
      related: {
        nameRelated: othersOnly || gridMode ? [] : nameRelated.slice(0, limit),
        others: othersOnly ? items : gridMode ? [] : others.slice(0, limit),
        grid: gridMode ? items : [],
        totalOthers: others.length,
      },
    })
  } catch (error) {
    console.error('Related products error:', error)
    return NextResponse.json({ error: 'Failed to fetch related products' }, { status: 500 })
  }
}

