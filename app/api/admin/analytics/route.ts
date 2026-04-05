export const dynamic = 'force-dynamic'
// app/api/admin/analytics/route.ts

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const range        = searchParams.get('range') || '7days'
    const universityId = searchParams.get('universityId') || 'all'

    let startDate = new Date()
    if (range === '7days')  startDate.setDate(startDate.getDate() - 7)
    else if (range === '30days') startDate.setDate(startDate.getDate() - 30)
    else if (range === '90days') startDate.setDate(startDate.getDate() - 90)
    else startDate = new Date(0)

    const periodMs  = Date.now() - startDate.getTime()
    const prevStart = new Date(startDate.getTime() - periodMs)

    // University scope helpers
    const uniFilter      = universityId !== 'all' ? { universityId }              : {}
    const orderUniFilter = universityId !== 'all' ? { buyer: { universityId } }   : {}

    const userBase    = { ...uniFilter }
    const productBase = { ...uniFilter }
    const orderBase   = { ...orderUniFilter }

    const [
      newUsers, newSellers, newRiders, newProducts,
      totalOrders, completedOrders,
      revenueAgg, topCategories, totalProducts, totalUsers,
      dauUsers, wauUsers, mauUsers,
      activeSellers, referralData,
      deliveryStats, failedOrders,
      prevRevenueAgg, repeatBuyers, engagedNewUsers,
    ] = await Promise.all([

      prisma.user.count({ where: { ...userBase, createdAt: { gte: startDate }, role: 'BUYER' } }),
      prisma.user.count({ where: { ...userBase, createdAt: { gte: startDate }, role: 'SELLER' } }),
      prisma.user.count({ where: { ...userBase, createdAt: { gte: startDate }, role: 'RIDER' } }),
      prisma.product.count({ where: { ...productBase, createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { ...orderBase, createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { ...orderBase, createdAt: { gte: startDate }, status: 'COMPLETED' } }),
      prisma.order.aggregate({
        where: { ...orderBase, createdAt: { gte: startDate }, status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
      }),
      prisma.product.groupBy({
        by: ['category'],
        where: productBase,
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 7,
      }),
      prisma.product.count({ where: productBase }),
      prisma.user.count({ where: userBase }),

      // Engagement
      prisma.user.count({
        where: {
          ...userBase,
          orders: { some: { createdAt: { gte: new Date(Date.now() - 86400000) } } },
        },
      }),
      prisma.user.count({
        where: {
          ...userBase,
          orders: { some: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } },
        },
      }),
      prisma.user.count({
        where: {
          ...userBase,
          orders: { some: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } },
        },
      }),

      // Marketplace Health
      prisma.user.count({
        where: {
          ...userBase,
          role: 'SELLER',
          products: { some: { createdAt: { gte: startDate } } },
        },
      }),

      prisma.referralReward.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),

      // Logistics
      prisma.order.findMany({
        where: { ...orderBase, status: 'COMPLETED', createdAt: { gte: startDate } },
        select: { createdAt: true, updatedAt: true },
        take: 200,
      }),

      prisma.order.count({
        where: {
          ...orderBase,
          createdAt: { gte: startDate },
          status: { in: ['CANCELLED', 'DISPUTED'] },
        },
      }),

      // Previous period revenue
      prisma.order.aggregate({
        where: { ...orderBase, createdAt: { gte: prevStart, lt: startDate }, status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
      }),

      // Repeat buyers
      prisma.user.count({
        where: {
          ...userBase,
          role: 'BUYER',
          orders: { some: { status: 'COMPLETED' } },
        },
      }),

      // Engaged new users
      prisma.user.count({
        where: {
          ...userBase,
          createdAt: { gte: startDate },
          orders: { some: {} },
        },
      }),
    ])

    // ── Derived Metrics ────────────────────────────────────────────────────
    const completionRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    const gmv                = revenueAgg._sum.totalAmount        || 0
    const platformCommission = revenueAgg._sum.platformCommission || 0
    const referralsPaidOut   = (referralData as any)._sum?.amount || 0
    const netRevenue         = platformCommission - referralsPaidOut

    const prevGmv       = prevRevenueAgg._sum.totalAmount        || 0
    const revenueTrend  = prevGmv > 0 ? ((gmv - prevGmv) / prevGmv) * 100 : 0

    const repeatBuyerPct = totalUsers > 0
      ? Math.round((repeatBuyers / totalUsers) * 100)
      : 0

    const retentionDay1 = newUsers > 0
      ? Math.round((engagedNewUsers / newUsers) * 100)
      : 0

    const avgDeliveryMinutes = deliveryStats.length > 0
      ? Math.round(
          deliveryStats.reduce((sum, o) => {
            const diff = (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 60000
            return sum + diff
          }, 0) / deliveryStats.length
        )
      : 0

    const failedDeliveryPct = totalOrders > 0
      ? parseFloat(((failedOrders / totalOrders) * 100).toFixed(1))
      : 0

    const ordersPerSeller  = activeSellers > 0
      ? parseFloat((completedOrders / activeSellers).toFixed(1))
      : 0

    const topCategoriesFormatted = (topCategories as any[]).map((c: any) => ({
      category: c.category,
      count:    c._count,
    }))

    return NextResponse.json({
      newUsers,        totalUsers,
      newSellers,      newRiders,
      newProducts,     totalProducts,
      totalOrders,     completedOrders,
      completionRate,
      revenue:          gmv,
      platformCommission,
      netRevenue,
      revenueTrend,

      dau: dauUsers,
      wau: wauUsers,
      mau: mauUsers,
      retentionDay1,
      retentionDay7: 0,
      repeatBuyerPct,

      appOpens:          0,
      productViews:      0,
      addToCart:         0,
      checkoutSuccessPct: completionRate,

      activeSellers,
      ordersPerSeller,
      listingGrowthPct: 0,

      avgDeliveryMinutes,
      riderCompletionRate: completionRate,
      failedDeliveryPct,

      gmv,
      cac: 0,
      ltv: 0,

      topCategories: topCategoriesFormatted,
      referrals: {
        newRewards:   (referralData as any)._count || 0,
        totalPaidOut: referralsPaidOut,
      },

      activeFilter: universityId,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}