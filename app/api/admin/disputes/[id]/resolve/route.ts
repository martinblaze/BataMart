export const dynamic = 'force-dynamic'
// app/api/admin/disputes/[id]/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { notifyDisputeResolved, notifyPenaltyIssued } from '@/lib/notification'
import { releaseSellerEscrowForOrder } from '@/lib/escrow'

async function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    return await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, role: true },
    })
  } catch {
    return null
  }
}

// POST: Admin resolves a dispute
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized — Admin only' }, { status: 401 })
    }

    const { id: disputeId } = params
    const body = await req.json()
    const { status, resolution, penalizeBuyer = false, penaltyReason = '' } = body

    if (!status || !resolution) {
      return NextResponse.json({ error: 'Status and resolution are required' }, { status: 400 })
    }
    if (['RESOLVED_BUYER_FAVOR', 'RESOLVED_COMPROMISE'].includes(status)) {
      return NextResponse.json({
        error: 'Use the return pickup flow for seller-fault disputes before releasing buyer refund.',
      }, { status: 400 })
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update dispute record
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolution,
          refundAmount: 0,
          resolvedAt: new Date(),
          resolvedBy: user.id,
        },
      })

      // Penalize buyer for false dispute if needed
      if (penalizeBuyer) {
        await tx.penalty.create({
          data: {
            userId: dispute.buyerId,
            action: 'WARNING',
            reason: penaltyReason || 'Unsubstantiated dispute claim',
            pointsAdded: 2,
            disputeId,
            issuedBy: user.id,
          },
        })

        await tx.user.update({
          where: { id: dispute.buyerId },
          data: {
            penaltyPoints: { increment: 2 },
            warningCount: { increment: 1 },
            lastWarningAt: new Date(),
          },
        })

        await notifyPenaltyIssued(
          dispute.buyerId,
          'WARNING',
          penaltyReason || 'Unsubstantiated dispute claim',
          2
        )
      }

      // Buyer fault / dismissed: release locked escrow to seller now.
      if (['RESOLVED_SELLER_FAVOR', 'DISMISSED'].includes(status)) {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { isDisputed: false },
        })
      }

      // Notify buyer only (seller is not part of this dispute flow)
      await notifyDisputeResolved(
        disputeId,
        dispute.buyerId,
        dispute.sellerId, // kept for DB compat, but buyer is who's notified
        resolution,
        dispute.order.orderNumber,
        dispute.orderId
      )

      return { updatedDispute }
    })

    if (['RESOLVED_SELLER_FAVOR', 'DISMISSED'].includes(status)) {
      await releaseSellerEscrowForOrder(
        dispute.orderId,
        dispute.sellerId,
        `Dispute resolved in seller favor (Order: ${dispute.order.orderNumber})`
      )
    }

    return NextResponse.json({
      success: true,
      dispute: result.updatedDispute,
      message: 'Dispute resolved successfully',
    })
  } catch (error) {
    console.error('Error resolving dispute:', error)
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 })
  }
}
