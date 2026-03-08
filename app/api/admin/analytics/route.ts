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
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '7days'

    let startDate = new Date()
    if (range === '7days') startDate.setDate(startDate.getDate() - 7)
    else if (range === '30days') startDate.setDate(startDate.getDate() - 30)
    else if (range === '90days') startDate.setDate(startDate.getDate() - 90)
    else startDate = new Date(0)

    const [
      newUsers,
      newProducts,
      totalOrders,
      completedOrders,
      revenue,
      topCategories,
      totalProducts,
      referralData,
      newSellers,
      newRiders,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'BUYER' } }),

      prisma.product.count({ where: { createdAt: { gte: startDate } } }),

      prisma.order.count({ where: { createdAt: { gte: startDate } } }),

      prisma.order.count({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
      }),

      prisma.order.aggregate({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
        _sum: { totalAmount: true, platformCommission: true },
      }),

      prisma.product.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 5,
      }),

      prisma.product.count(),

      // Referral stats for period
      prisma.referralReward.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
      }).catch(() => ({ _sum: { amount: 0 }, _count: 0 })),

      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'SELLER' } }),

      prisma.user.count({ where: { createdAt: { gte: startDate }, role: 'RIDER' } }),
    ])

    // Completion rate
    const completionRate = totalOrders > 0
      ? Math.round((completedOrders / totalOrders) * 100)
      : 0

    return NextResponse.json({
      analytics: {
        newUsers,
        newSellers,
        newRiders,
        newProducts,
        totalOrders,
        completedOrders,
        completionRate,
        revenue: revenue._sum.totalAmount || 0,
        platformCommission: revenue._sum.platformCommission || 0,
        totalProducts,
        topCategories: topCategories.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        referrals: {
          newRewards: referralData._count,
          totalPaidOut: referralData._sum.amount || 0,
        },
      },
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}