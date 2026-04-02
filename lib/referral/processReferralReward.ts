// lib/referral/processReferralReward.ts
// Called inside the confirm-delivery transaction when an order completes.
// Returns silently on any error so it never blocks the main order flow.

import { Prisma } from '@prisma/client'

// ── Referral reward = ₦120 (50% of the ₦240 delivery platform cut) ────────────
// The platform keeps its 5% product commission entirely.
// ₦120 of the ₦240 delivery cut goes to the referrer (forever, every order).
// Only paid if the order had a rider (delivery orders only).
const REFERRAL_DELIVERY_REWARD = 120

/**
 * Must be called INSIDE an existing prisma.$transaction(tx => ...) block.
 *
 * Checks if the buyer was referred. If so, credits the referrer ₦120
 * (50% of the delivery platform cut) for every completed delivery order — forever.
 *
 * The @unique constraint on ReferralReward.orderId guarantees idempotency.
 */
export async function processReferralReward(
  tx: Prisma.TransactionClient,
  params: {
    orderId:     string
    orderNumber: string
    orderAmount: number
    buyerId:     string
    hasRider:    boolean   // ← only pay if delivery order
  }
) {
  const { orderId, orderNumber, buyerId, hasRider } = params

  // Only pay referral reward on delivery orders
  if (!hasRider) return

  // 1. Check if buyer was referred
  const buyer = await tx.user.findUnique({
    where:  { id: buyerId },
    select: { referredById: true },
  })

  if (!buyer?.referredById) return   // no referrer — nothing to do

  // 2. Guard: skip if reward already exists for this order
  const existing = await tx.referralReward.findUnique({
    where:  { orderId },
    select: { id: true },
  })
  if (existing) return   // idempotency guard

  const reward = REFERRAL_DELIVERY_REWARD   // flat ₦120

  // 3. Fetch referrer's current balance
  const referrer = await tx.user.findUnique({
    where:  { id: buyer.referredById },
    select: { id: true, availableBalance: true },
  })
  if (!referrer) return

  const balanceBefore = referrer.availableBalance
  const balanceAfter  = balanceBefore + reward

  // 4. Create ReferralReward record
  await tx.referralReward.create({
    data: {
      referrerId:     referrer.id,
      referredUserId: buyerId,
      orderId,
      amount:         reward,
    },
  })

  // 5. Credit referrer's wallet
  await tx.user.update({
    where: { id: referrer.id },
    data:  { availableBalance: { increment: reward } },
  })

  // 6. Create wallet transaction record
  await tx.transaction.create({
    data: {
      userId:        referrer.id,
      type:          'REFERRAL_REWARD',
      amount:        reward,
      description:   `Referral reward — delivery cut from order #${orderNumber}`,
      reference:     `${orderNumber}-REFERRAL`,
      balanceBefore,
      balanceAfter,
    },
  })

  // 7. Create in-app notification
  await tx.notification.create({
    data: {
      userId:  referrer.id,
      type:    'REFERRAL_REWARD',
      title:   '🎁 Referral Reward!',
      message: `You earned ₦120 delivery reward from order #${orderNumber}.`,
      orderId,
      metadata: JSON.stringify({ reward, orderNumber }),
    },
  })
}