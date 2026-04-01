// lib/finance/calculatePayout.ts

export function calculatePayout(subtotal: number, deliveryFee: number = 800) {
  const PLATFORM_RATE          = 0.05
  const RIDER_SHARE            = 560
  // ── NEW: ₦240 delivery cut now goes to referrer, not platform ──────────────
  const REFERRAL_DELIVERY_CUT  = 240   // referrer earns this per delivery order
  const PLATFORM_DELIVERY_CUT  = 0     // platform no longer takes a cut of delivery

  const platformFeeFromProducts = subtotal * PLATFORM_RATE
  const sellerShare             = subtotal - platformFeeFromProducts
  const riderShare              = RIDER_SHARE
  const referralDeliveryCut     = REFERRAL_DELIVERY_CUT   // goes to referrer if applicable
  const platformTotal           = platformFeeFromProducts  // platform only earns product commission
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