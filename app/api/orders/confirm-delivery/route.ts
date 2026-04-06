// app/api/orders/confirm-delivery/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { processReferralReward } from '@/lib/referral/processReferralReward'

export const dynamic = 'force-dynamic'

const recentConfirmations = new Map<string, number>()
const CONFIRMATION_COOLDOWN = 5000

function cleanupOldEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  recentConfirmations.forEach((timestamp, key) => {
    if (now - timestamp > 60000) keysToDelete.push(key)
  })
  keysToDelete.forEach(key => recentConfirmations.delete(key))
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // ── DUPLICATE PREVENTION ──────────────────────────────────
    const confirmKey = `${user.id}-${orderId}`
    const lastConfirmTime = recentConfirmations.get(confirmKey)
    const now = Date.now()

    if (lastConfirmTime && (now - lastConfirmTime) < CONFIRMATION_COOLDOWN) {
      const remainingTime = Math.ceil((CONFIRMATION_COOLDOWN - (now - lastConfirmTime)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${remainingTime} seconds before confirming again` },
        { status: 429 }
      )
    }

    recentConfirmations.set(confirmKey, now)
    cleanupOldEntries()

    // ── Fetch order ───────────────────────────────────────────
    // FIXED: include batchId so we can pass it to processReferralReward.
    // Without batchId, the referral guard falls back to orderId uniqueness,
    // meaning a referrer could receive one reward per order in a multi-order
    // batch instead of one reward for the whole batch.
    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { seller: true, rider: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.buyerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        {
          error:            'Order already completed',
          message:          'This order has already been confirmed and payment released',
          alreadyCompleted: true,
        },
        { status: 400 }
      )
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: `Cannot confirm. Order status is: ${order.status}` },
        { status: 400 }
      )
    }

    // ═══════════════════════════════════════════════════════════════
    // PAYOUT BREAKDOWN (per order):
    //   subtotal        = product cost
    //   platformFee     = subtotal * 5%          (platform keeps this fully)
    //   riderShare      = ₦560                   (rider gets this)
    //   referralReward  = ₦120                   (referrer gets this — 50% of delivery cut)
    //   platformDelivery= ₦120                   (platform retains other 50% of delivery cut)
    //   sellerShare     = subtotal - platformFee  (seller gets this)
    //
    //   Buyer pays: subtotal + ₦800 delivery fee
    //   Platform earns: subtotal * 5% + ₦120 (when referral applies)
    //                or subtotal * 5% + ₦240 (when no referral, full delivery cut kept)
    // ═══════════════════════════════════════════════════════════════

    const subtotal    = order.totalAmount - (order.riderId ? 800 : 0)
    const sellerShare = subtotal - order.platformCommission
    const riderShare  = 560
    const hasRider    = !!order.riderId

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark order COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      })

      // 2. Release seller payment
      const sellerAvailable = Number(order.seller.availableBalance ?? 0)

      await tx.user.update({
        where: { id: order.sellerId },
        data:  {
          pendingBalance:   { decrement: sellerShare },
          availableBalance: { increment: sellerShare },
        },
      })

      await tx.transaction.create({
        data: {
          userId:        order.sellerId,
          type:          'CREDIT',
          amount:        sellerShare,
          description:   `Payment received for Order: ${order.orderNumber}`,
          reference:     `${order.orderNumber}-SELLER-RELEASE`,
          balanceBefore: sellerAvailable,
          balanceAfter:  sellerAvailable + sellerShare,
        },
      })

      // 3. Release rider payment (if assigned)
      if (order.riderId) {
        const rider        = await tx.user.findUnique({
          where:  { id: order.riderId },
          select: { availableBalance: true },
        })
        const riderBalance = Number(rider?.availableBalance ?? 0)

        await tx.user.update({
          where: { id: order.riderId },
          data:  { availableBalance: { increment: riderShare } },
        })

        await tx.transaction.create({
          data: {
            userId:        order.riderId,
            type:          'CREDIT',
            amount:        riderShare,
            description:   `Delivery fee for Order: ${order.orderNumber}`,
            reference:     `${order.orderNumber}-RIDER-RELEASE`,
            balanceBefore: riderBalance,
            balanceAfter:  riderBalance + riderShare,
          },
        })
      }

      // 4. ── REFERRAL REWARD ────────────────────────────────────────
      // Referrer earns ₦120 (50% of the ₦240 delivery platform cut) on every
      // completed delivery order from their referral — forever.
      // Platform keeps its full 5% product commission plus the other ₦120.
      //
      // FIXED: batchId is now forwarded so processReferralReward uses the
      // DeliveryBatch.referralPaid flag as the idempotency gate instead of
      // falling back to per-order orderId uniqueness.
      // This ensures the referrer receives exactly ONE ₦120 reward per
      // checkout session regardless of how many orders were in the cart.
      await processReferralReward(tx, {
        orderId,
        orderNumber: order.orderNumber,
        orderAmount: order.totalAmount,
        buyerId:     order.buyerId,
        hasRider,
        batchId:     order.batchId ?? undefined,  // ← FIXED (was missing)
      })

      return updatedOrder
    }, {
      timeout: 15000,
      maxWait:  20000,
    })

    console.log(`✅ Order ${order.orderNumber} completed by buyer ${user.name}`)

    return NextResponse.json({
      success: true,
      message: '🎉 Payment released! Seller and rider have been paid.',
      order:   result,
    })
  } catch (error) {
    console.error('Confirm delivery error:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          error:            'Order already processed',
          message:          'This order has already been confirmed',
          alreadyCompleted: true,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to confirm delivery' },
      { status: 500 }
    )
  }
}