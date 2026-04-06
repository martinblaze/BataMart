// app/api/admin/referrals/route.ts
// Extends admin analytics with referral metrics

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── FIXED: use the same JWT-based verifyAdmin pattern as every other admin route.
// Previously this route used `x-admin-token: ADMIN_SECRET` (a static shared secret),
// which is weaker than a signed JWT and inconsistent with the rest of the admin API
// surface. Any code that was calling this with x-admin-token must be updated to send
// `Authorization: Bearer <adminToken>` instead (same as all other admin fetches).
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

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [
      totalReferralUsers,
      totalRewardsPaid,
      topReferrers,
      recentRewards,
    ] = await Promise.all([
      // Users who were referred
      prisma.user.count({ where: { referredById: { not: null } } }),

      // Total amount paid in referral rewards
      prisma.referralReward.aggregate({ _sum: { amount: true } }),

      // Top 10 referrers by earnings
      prisma.referralReward.groupBy({
        by:      ['referrerId'],
        _sum:    { amount: true },
        _count:  { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take:    10,
      }),

      // Recent 20 rewards
      prisma.referralReward.findMany({
        take:    20,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer:     { select: { name: true, email: true } },
          referredUser: { select: { name: true } },
          order:        { select: { orderNumber: true, totalAmount: true } },
        },
      }),
    ])

    // Enrich top referrers with names
    const referrerIds  = topReferrers.map(r => r.referrerId)
    const referrerUsers = await prisma.user.findMany({
      where:  { id: { in: referrerIds } },
      select: { id: true, name: true, email: true },
    })
    const referrerMap = Object.fromEntries(referrerUsers.map(u => [u.id, u]))

    return NextResponse.json({
      metrics: {
        totalReferralUsers,
        totalRewardsPaid:  totalRewardsPaid._sum.amount || 0,
        totalRewardCount:  await prisma.referralReward.count(),
      },
      topReferrers: topReferrers.map(r => ({
        referrerId:     r.referrerId,
        name:           referrerMap[r.referrerId]?.name  || 'Unknown',
        email:          referrerMap[r.referrerId]?.email || '',
        totalEarned:    r._sum.amount || 0,
        totalReferrals: r._count.id,
      })),
      recentRewards: recentRewards.map(r => ({
        id:           r.id,
        referrer:     r.referrer.name,
        referredUser: r.referredUser.name,
        orderNumber:  r.order.orderNumber,
        orderAmount:  r.order.totalAmount,
        rewardAmount: r.amount,
        earnedAt:     r.createdAt,
      })),
    })
  } catch (error) {
    console.error('Admin referral analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch referral analytics' }, { status: 500 })
  }
}