export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

type RankedItem = {
  key: string
  dateKey: string
  score: number
  soldCount: number
  uniqueBuyers: number
  product: {
    id: string
    name: string
    price: number
    images: string[]
    category: string
    seller: {
      id: string
      name: string
      avgRating: number
      trustLevel: string
    }
  }
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.universityId) {
      return NextResponse.json({ items: [], page: 1, hasMore: false, total: 0 })
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') === 'daily' ? 'daily' : 'top'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(40, Math.max(1, parseInt(searchParams.get('pageSize') || (mode === 'daily' ? '20' : '12'))))
    const daysBack = Math.min(180, Math.max(14, parseInt(searchParams.get('daysBack') || '120')))

    const since = new Date()
    since.setDate(since.getDate() - daysBack)

    const [myOrders, orders] = await Promise.all([
      prisma.order.findMany({
        where: { buyerId: user.id },
        take: 120,
        orderBy: { orderedAt: 'desc' },
        select: { product: { select: { category: true } } },
      }),
      prisma.order.findMany({
        where: {
          status: { in: ['DELIVERED', 'COMPLETED'] },
          orderedAt: { gte: since },
          product: {
            universityId: user.universityId,
            isActive: true,
            isDeleted: false,
            quantity: { gt: 0 },
          },
        },
        select: {
          productId: true,
          buyerId: true,
          quantity: true,
          orderedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true,
              category: true,
              sellerId: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                  avgRating: true,
                  trustLevel: true,
                },
              },
            },
          },
        },
      }),
    ])

    const preferredCategories = new Set(
      myOrders.map(o => o.product?.category).filter(Boolean) as string[]
    )

    const byDayAndProduct = new Map<string, {
      dateKey: string
      soldCount: number
      buyers: Set<string>
      product: RankedItem['product']
    }>()

    const byProduct = new Map<string, {
      soldCount: number
      buyers: Set<string>
      newestDate: Date
      product: RankedItem['product']
    }>()

    for (const o of orders) {
      if (!o.product || o.product.sellerId === user.id) continue
      const qty = Math.max(1, Number(o.quantity || 1))
      const dateKey = toDateKey(new Date(o.orderedAt))
      const dayProductKey = `${dateKey}:${o.productId}`

      if (!byDayAndProduct.has(dayProductKey)) {
        byDayAndProduct.set(dayProductKey, {
          dateKey,
          soldCount: 0,
          buyers: new Set<string>(),
          product: o.product,
        })
      }
      const d = byDayAndProduct.get(dayProductKey)!
      d.soldCount += qty
      d.buyers.add(o.buyerId)

      if (!byProduct.has(o.productId)) {
        byProduct.set(o.productId, {
          soldCount: 0,
          buyers: new Set<string>(),
          newestDate: new Date(o.orderedAt),
          product: o.product,
        })
      }
      const p = byProduct.get(o.productId)!
      p.soldCount += qty
      p.buyers.add(o.buyerId)
      if (new Date(o.orderedAt) > p.newestDate) p.newestDate = new Date(o.orderedAt)
    }

    let ranked: RankedItem[] = []

    if (mode === 'daily') {
      ranked = Array.from(byDayAndProduct.entries()).map(([key, v]) => {
        const ageDays = Math.max(
          0,
          Math.floor((Date.now() - new Date(v.dateKey).getTime()) / (1000 * 60 * 60 * 24))
        )
        const recencyBoost = Math.max(0, 24 - ageDays * 2)
        const todayBoost = ageDays === 0 ? 75 : ageDays === 1 ? 24 : 0
        const prefBoost = preferredCategories.has(v.product.category) ? 8 : 0
        const score = v.soldCount * 7 + v.buyers.size * 5 + recencyBoost + todayBoost + prefBoost
        return {
          key,
          dateKey: v.dateKey,
          score,
          soldCount: v.soldCount,
          uniqueBuyers: v.buyers.size,
          product: v.product,
        }
      })

      ranked.sort((a, b) => {
        if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? 1 : -1
        if (b.score !== a.score) return b.score - a.score
        return b.soldCount - a.soldCount
      })
    } else {
      ranked = Array.from(byProduct.entries()).map(([productId, v]) => {
        const ageDays = Math.max(0, Math.floor((Date.now() - v.newestDate.getTime()) / (1000 * 60 * 60 * 24)))
        const recencyBoost = Math.max(0, 14 - ageDays)
        const prefBoost = preferredCategories.has(v.product.category) ? 10 : 0
        const score = v.soldCount * 4 + v.buyers.size * 4 + recencyBoost + prefBoost
        return {
          key: productId,
          dateKey: toDateKey(v.newestDate),
          score,
          soldCount: v.soldCount,
          uniqueBuyers: v.buyers.size,
          product: v.product,
        }
      })

      ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return b.soldCount - a.soldCount
      })
    }

    const total = ranked.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const items = ranked.slice(start, end)

    return NextResponse.json({
      mode,
      page,
      pageSize,
      total,
      hasMore: end < total,
      items,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('people-like-you feed error:', error)
    return NextResponse.json({ error: 'Failed to load people-like-you feed' }, { status: 500 })
  }
}
