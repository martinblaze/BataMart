// app/api/products/feed/route.ts
//
// PHASE 1 (no/few sales): hot = most viewed products
// PHASE 2 (sales exist):  hot = most viewed + priced below last confirmed sale
//
// isHot, isDeal, hotReason, discountPercent, marketPrice are all written
// by the engine — this route just reads them from DB.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { updateHotStatus } from '@/lib/marketPrice/engine'

const W = {
  category: 50,
  searched: 40,
  popular: 20,
  orderCount: 15,
  sellerGold: 10,
  sellerSilver: 5,
  recency: 8,
}

const HOT_BACKFILL_COOLDOWN_MS = 10 * 60 * 1000
const HOT_BACKFILL_BATCH = 120
const hotBackfillStateByUniversity = new Map<string, number>()

function normalisedCount(value: number, max: number, weight: number): number {
  return max === 0 ? 0 : (value / max) * weight
}

async function backfillExistingHotStatuses(universityId: string): Promise<void> {
  const candidates = await prisma.product.findMany({
    where: {
      universityId,
      isActive: true,
      isDeleted: false,
      quantity: { gt: 0 },
    },
    select: {
      id: true,
    },
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: HOT_BACKFILL_BATCH,
  })

  for (const product of candidates) {
    await updateHotStatus(product.id).catch(() => {})
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.universityId) {
      return NextResponse.json({ error: 'No university on account' }, { status: 403 })
    }

    const lastBackfillAt = hotBackfillStateByUniversity.get(user.universityId) || 0
    const nowTs = Date.now()
    if (nowTs - lastBackfillAt > HOT_BACKFILL_COOLDOWN_MS) {
      hotBackfillStateByUniversity.set(user.universityId, nowTs)
      setImmediate(() => {
        backfillExistingHotStatuses(user.universityId as string).catch(() => {})
      })
    }

    const { searchParams } = new URL(request.url)
    const userCategories = (searchParams.get('categories') || '').split(',').filter(Boolean)
    const userKeywords = (searchParams.get('keywords') || '').split(',').filter(Boolean)

    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        isDeleted: false,
        universityId: user.universityId,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            avgRating: true,
            trustLevel: true,
            completedOrders: true,
          },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const now = Date.now()
    const maxViews = Math.max(...allProducts.map(p => p.viewCount || 0), 1)
    const maxOrders = Math.max(...allProducts.map(p => p._count.orders || 0), 1)

    const scored = allProducts.map(product => {
      const ageDays = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      let score = 0

      if (userCategories.includes(product.category)) score += W.category

      for (const kw of userKeywords) {
        if (
          product.name.toLowerCase().includes(kw.toLowerCase()) ||
          product.category.toLowerCase().includes(kw.toLowerCase())
        ) {
          score += W.searched
          break
        }
      }

      score += normalisedCount(product.viewCount || 0, maxViews, W.popular)
      score += normalisedCount(product._count.orders || 0, maxOrders, W.orderCount)

      if (product.seller.trustLevel === 'GOLD') score += W.sellerGold
      else if (product.seller.trustLevel === 'SILVER') score += W.sellerSilver

      if (ageDays < 3) score += W.recency

      return {
        ...product,
        score,
        isPersonalised: score >= W.category,
        isNew: ageDays <= 7,
        isHot: product.isHot ?? false,
        hotReason: product.hotReason ?? null,
        isDeal: product.isDeal ?? false,
        discountPercent: product.discountPercent ?? null,
        marketPrice: product.marketPrice ?? null,
      }
    })

    // Hot deals — priority: BOTH > DEAL > VIEWS
    const hotProducts = scored
      .filter(p => p.isHot)
      .sort((a, b) => {
        const priority = { BOTH: 3, DEAL: 2, VIEWS: 1 }
        const aPri = priority[a.hotReason as keyof typeof priority] || 0
        const bPri = priority[b.hotReason as keyof typeof priority] || 0
        if (bPri !== aPri) return bPri - aPri
        if (a.hotReason !== 'VIEWS' && b.hotReason !== 'VIEWS') {
          return (b.discountPercent || 0) - (a.discountPercent || 0)
        }
        return (b.viewCount || 0) - (a.viewCount || 0)
      })
      .slice(0, 20)

    const forYouProducts = scored
      .filter(p => p.isPersonalised)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)

    const newListings = scored
      .filter(p => p.isNew)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)

    const shownIds = new Set([...hotProducts, ...forYouProducts, ...newListings].map(p => p.id))
    const discoverProducts = scored
      .filter(p => !shownIds.has(p.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)

    return NextResponse.json({
      success: true,
      products: scored,
      hotProducts,
      forYouProducts,
      newListings,
      discoverProducts,
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 })
  }
}
