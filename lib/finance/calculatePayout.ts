// lib/finance/calculatePayout.ts

export function calculatePayout(subtotal: number, deliveryFee: number = 800) {
  const PLATFORM_RATE          = 0.05
  const RIDER_SHARE            = 560
  // ── ₦120 delivery cut goes to referrer (50% of the original ₦240) ──────────
  const REFERRAL_DELIVERY_CUT  = 120   // referrer earns this per delivery order
  const PLATFORM_DELIVERY_CUT  = 120   // platform retains the other ₦120

  const platformFeeFromProducts = subtotal * PLATFORM_RATE
  const sellerShare             = subtotal - platformFeeFromProducts
  const riderShare              = RIDER_SHARE
  const referralDeliveryCut     = REFERRAL_DELIVERY_CUT   // goes to referrer if applicable
  const platformTotal           = platformFeeFromProducts + PLATFORM_DELIVERY_CUT
  const totalAmount             = subtotal + deliveryFee

  return {
    subtotal,
    deliveryFee,
    totalAmount,
    sellerShare,
    riderShare,
    referralDeliveryCut,
    platformTotal,
    // legacy field names kept for compatibility
    platformFee: platformFeeFromProducts,
  }
}