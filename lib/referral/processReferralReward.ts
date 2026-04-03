// lib/referral/processReferralReward.ts
// Called inside the confirm-delivery transaction when an order completes.
// Returns silently on any error so it never blocks the main order flow.
//
// BATCH BEHAVIOUR:
//   When an order belongs to a DeliveryBatch, the referral reward (₦120)
//   fires only ONCE for the whole batch — regardless of how many orders
//   are inside it. The DeliveryBatch.referralPaid flag is the atomic gate.
//   This means the referrer gets ₦120 per checkout session, not per item.

import { Prisma } from '@prisma/client'

// ── Referral reward = ₦120 (50% of the ₦240 delivery platform cut) ──────────
// Platform keeps its 5% product commission entirely.
// ₦120 of the ₦240 delivery cut goes to the referrer (once per batch).
// Only paid if the order had a rider (delivery orders only).
const REFERRAL_DELIVERY_REWARD = 120

/**
 * Must be called INSIDE an existing prisma.$transaction(tx => ...) block.
 *
 * For batched orders: credits the referrer ₦120 once per checkout batch.
 * For legacy single orders: uses orderId uniqueness as before.
 *
 * The DeliveryBatch.referralPaid flag guarantees idempotency even if
 * confirm-delivery is called on multiple orders in the same batch
 * concurrently.
 */
export async function processReferralReward(
  tx: Prisma.TransactionClient,
  params: {
    orderId:     string
    orderNumber: string
    orderAmount: number
    buyerId:     string
    hasRider:    boolean
    batchId?:    string   // ← pass this when the order belongs to a DeliveryBatch
  }
) {
  const { orderId, orderNumber, buyerId, hasRider, batchId } = params

  // Only pay referral reward on delivery orders
  if (!hasRider) return

  // ── Batch path: use referralPaid flag on batch ───────────────────────────
  if (batchId) {
    const batch = await tx.deliveryBatch.findUnique({
      where:  { id: batchId },
      select: { referralPaid: true },
    })

    // batch not found or reward already paid for this batch
    if (!batch || batch.referralPaid) return

    // Mark batch as referral-paid atomically inside this transaction
    await tx.deliveryBatch.update({
      where: { id: batchId },
      data:  { referralPaid: true },
    })
  } else {
    // ── Legacy single-order path: use orderId uniqueness guard ───────────
    const existing = await tx.referralReward.findUnique({
      where:  { orderId },
      select: { id: true },
    })
    if (existing) return
  }

  // ── Check if buyer was referred ─────────────────────────────────────────
  const buyer = await tx.user.findUnique({
    where:  { id: buyerId },
    select: { referredById: true },
  })

  if (!buyer?.referredById) return  // buyer was not referred — nothing to do

  // ── Fetch referrer ───────────────────────────────────────────────────────
  const referrer = await tx.user.findUnique({
    where:  { id: buyer.referredById },
    select: { id: true, availableBalance: true },
  })
  if (!referrer) return

  const balanceBefore = Number(referrer.availableBalance)
  const balanceAfter  = balanceBefore + REFERRAL_DELIVERY_REWARD

  // ── Create ReferralReward record (orderId is still recorded for traceability) ─
  await tx.referralReward.create({
    data: {
      referrerId:     referrer.id,
      referredUserId: buyerId,
      orderId,         // attached to the first order that triggered the reward
      amount:          REFERRAL_DELIVERY_REWARD,
    },
  })

  // ── Credit referrer's wallet ─────────────────────────────────────────────
  await tx.user.update({
    where: { id: referrer.id },
    data:  { availableBalance: { increment: REFERRAL_DELIVERY_REWARD } },
  })

  // ── Wallet transaction record ────────────────────────────────────────────
  await tx.transaction.create({
    data: {
      userId:        referrer.id,
      type:          'REFERRAL_REWARD',
      amount:        REFERRAL_DELIVERY_REWARD,
      description:   batchId
        ? `Referral reward — batch delivery (order #${orderNumber})`
        : `Referral reward — delivery cut from order #${orderNumber}`,
      reference:     `${orderNumber}-REFERRAL`,
      balanceBefore,
      balanceAfter,
    },
  })

  // ── In-app notification ──────────────────────────────────────────────────
  await tx.notification.create({
    data: {
      userId:  referrer.id,
      type:    'REFERRAL_REWARD',
      title:   '🎁 Referral Reward!',
      message: batchId
        ? `You earned ₦120 referral reward from a batch delivery by your referral.`
        : `You earned ₦120 delivery reward from order #${orderNumber}.`,
      orderId,
      metadata: JSON.stringify({ reward: REFERRAL_DELIVERY_REWARD, orderNumber, batchId }),
    },
  })
}