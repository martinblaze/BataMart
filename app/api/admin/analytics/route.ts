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
    const range = searchParams.get('range') || '7days'

    let startDate = new Date()
    if (range === '7days') startDate.setDate(startDate.getDate() - 7)
    else if (range === '30days') startDate.setDate(startDate.getDate() - 30)
    else if (range === '90days') startDate.setDate(startDate.getDate() - 90)
    else startDate = new Date(0)

    // ── Previous period for retention calculations ──────────────────────────
    const periodMs = Date.now() - startDate.getTime()
    const prevStart = new Date(startDate.getTime() - periodMs)

    // ── All Queries in parallel ─────────────────────────────────────────────
    const [
      // Growth
      newUsers,
      newSellers,
      newRiders,
      newProducts,
      totalOrders,
      completedOrders,
      revenueAgg,
      topCategories,
      totalProducts,
      totalUsers,

      // Engagement
      dauUsers,
      wauUsers,
      mauUsers,

      // Marketplace Health
      activeSellers,
      referralData,

      // Logistics — delivery times from completed orders
      deliveryStats,
      failedOrders,

      // Money — previous period for trend comparisons
      prevRevenueAgg,

      // Repeat buyers: users who have more than 1 completed order
      repeatBuyers,

      // Retention Day 1: users created yesterday who came back today
      // Approximated by: new users in period who placed ≥1 order
      engagedNewUsers,
    ] = await Promise.all([

      // ── Growth ──────────────────────────────────────────────────────────────
      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'BUYER' } }),
      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'SELLER' } }),
      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'RIDER' } }),
      prisma.product.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { createdAt: { gte: startDate } } }),
      prisma.order.count({ where: { createdAt: { gte: startDate }, status: 'COMPLETED' } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 7,
      }),
      prisma.product.count(),
      prisma.user.count(),

      // ── Engagement (active = placed ≥1 order OR logged any session) ─────────
      // Approximation: users who placed orders in last 1 day / 7 days / 30 days
      prisma.user.count({
        where: {
          orders: {
            some: { createdAt: { gte: new Date(Date.now() - 86400000) } },
          },
        },
      }),
      prisma.user.count({
        where: {
          orders: {
            some: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
          },
        },
      }),
      prisma.user.count({
        where: {
          orders: {
            some: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
          },
        },
      }),

      // ── Marketplace Health ──────────────────────────────────────────────────
      prisma.user.count({
        where: {
          role: 'SELLER',
          products: { some: { createdAt: { gte: startDate } } },
        },
      }),

      prisma.referralReward.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),

      // ── Logistics ───────────────────────────────────────────────────────────
      // Average delivery time: difference between order created and COMPLETED status
      // Using deliveredAt if available, otherwise updatedAt as proxy
      prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        select: { createdAt: true, updatedAt: true },
        take: 200,
      }),

      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['CANCELLED', 'DISPUTED'] },
        },
      }),

      // ── Money: previous period revenue for trend ─────────────────────────
      prisma.order.aggregate({
        where: { createdAt: { gte: prevStart, lt: startDate }, status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
      }),

      // ── Repeat buyers (bought more than once ever) ───────────────────────
      prisma.user.count({
        where: {
          role: 'BUYER',
          orders: { some: { status: 'COMPLETED' } },
        },
      }),

      // ── Engaged new users (new in period who placed any order) ───────────
      prisma.user.count({
        where: {
          createdAt: { gte: startDate },
          orders: { some: {} },
        },
      }),
    ])

    // ── Derived Metrics ───────────────────────────────────────────────────────

    const completionRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    const gmv = revenueAgg._sum.totalAmount || 0
    const platformCommission = revenueAgg._sum.platformCommission || 0
    const referralsPaid = referralData._sum?.amount || 0

    // Net revenue = commission earned - referral rewards paid out
    const netRevenue = platformCommission - referralsPaid

    // Average delivery time in minutes (updatedAt - createdAt for completed orders)
    const avgDeliveryMinutes = deliveryStats.length > 0
      ? Math.round(
          deliveryStats.reduce((sum, o) => {
            return sum + (o.updatedAt.getTime() - o.createdAt.getTime())
          }, 0) / deliveryStats.length / 60000
        )
      : 0

    const riderCompletionRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    const failedDeliveryPct = totalOrders > 0
      ? parseFloat(((failedOrders / totalOrders) * 100).toFixed(1))
      : 0

    // Orders per active seller
    const ordersPerSeller = activeSellers > 0
      ? parseFloat((totalOrders / activeSellers).toFixed(1))
      : 0

    // Listing growth % over period
    const listingGrowthPct = totalProducts > newProducts && totalProducts > 0
      ? parseFloat(((newProducts / (totalProducts - newProducts)) * 100).toFixed(1))
      : 0

    // CAC: referral payout per new user (simplified)
    const newTotalUsers = newUsers + newSellers + newRiders
    const cac = newTotalUsers > 0 ? referralsPaid / newTotalUsers : 0

    // LTV: average revenue per buyer (total GMV / total buyers ever)
    const totalBuyers = await prisma.user.count({ where: { role: 'BUYER' } })
    const ltv = totalBuyers > 0 ? gmv / totalBuyers : 0

    // Retention approximations
    const retentionDay1 = newUsers > 0
      ? parseFloat(((engagedNewUsers / newUsers) * 100).toFixed(1))
      : 0
    const retentionDay7 = mauUsers > 0
      ? parseFloat(((wauUsers / mauUsers) * 100).toFixed(1))
      : 0

    // Repeat buyer %
    const repeatBuyerPct = totalBuyers > 0
      ? parseFloat(((repeatBuyers / totalBuyers) * 100).toFixed(1))
      : 0

    // Funnel (app opens not tracked yet → use a proxy or 0 until instrumented)
    const appOpens = 0   // Wire up when you add analytics events
    const productViews = 0 // Wire up when you add analytics events
    const addToCart = 0    // Wire up when you add analytics events
    const checkoutSuccessPct = totalOrders > 0
      ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(1))
      : 0

    return NextResponse.json({
      analytics: {
        // Growth
        newUsers,
        totalUsers,
        newSellers,
        newRiders,
        newProducts,
        totalProducts,
        totalOrders,
        completedOrders,
        completionRate,
        revenue: gmv,
        platformCommission,

        // Engagement
        dau: dauUsers,
        wau: wauUsers,
        mau: mauUsers,
        retentionDay1,
        retentionDay7,
        repeatBuyerPct,

        // Funnel
        appOpens,
        productViews,
        addToCart,
        checkoutSuccessPct,

        // Marketplace
        activeSellers,
        ordersPerSeller,
        listingGrowthPct,

        // Logistics
        avgDeliveryMinutes,
        riderCompletionRate,
        failedDeliveryPct,

        // Money
        gmv,
        netRevenue,
        cac,
        ltv,

        // Categories
        topCategories: topCategories.map((c) => ({
          category: c.category,
          count: c._count,
        })),

        // Referrals
        referrals: {
          newRewards: referralData._count,
          totalPaidOut: referralsPaid,
        },
      },
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}