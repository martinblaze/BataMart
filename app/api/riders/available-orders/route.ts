// app/api/riders/available-orders/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'RIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.universityId) {
      return NextResponse.json({ orders: [], disputePickups: [] })
    }

    // ── Regular pending orders — scoped to rider's university ──────────────
    // Orders inherit universityId from the buyer who placed them.
    // A rider only sees orders from buyers in their own university.
    const orders = await prisma.order.findMany({
      where: {
        status:      'PENDING',
        riderId:     null,
        isDisputed:  false,
        buyer: {
          universityId: user.universityId,
        },
      },
      include: {
        product: true,
        seller:  { select: { name: true, phone: true } },
        buyer:   { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ── Dispute pickup jobs assigned specifically to this rider ────────────
    const disputePickups = await prisma.order.findMany({
      where: {
        riderId:    user.id,
        isDisputed: true,
        status:     'RIDER_ASSIGNED',
        dispute: {
          resolution: '__AWAITING_PICKUP__',
        },
      },
      include: {
        product: true,
        seller:  { select: { name: true, phone: true } },
        buyer:   { select: { name: true, phone: true } },
        dispute: {
          select: {
            id:             true,
            reason:         true,
            pickupAddress:  true,
          },
        },
      },
    })

    return NextResponse.json({ orders, disputePickups })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}