// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrders, calculateFees } from '../initialize/route'
import { notifyOrderPlaced } from '@/lib/push/sendPushNotification'

export const dynamic = 'force-dynamic'

// ── Helper: always use the public app URL for redirects ──────────────────────
function appRedirect(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bata-mart.vercel.app'
  return NextResponse.redirect(`${base}${path}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  console.log('═'.repeat(70))
  console.log('🔥 PAYMENT VERIFICATION STARTED')
  console.log('═'.repeat(70))
  console.log('📍 Reference:', reference)
  console.log('📍 Timestamp:', new Date().toISOString())

  if (!reference) {
    console.error('❌ ERROR: No reference in URL')
    return appRedirect('/checkout?error=no_reference')
  }

  try {
    console.log('\n📞 STEP 1: Verifying with Paystack')

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )

    console.log('HTTP Status:', verifyRes.status)
    const verifyData = await verifyRes.json()
    console.log('📦 Paystack Response status:', verifyData?.status, '| tx status:', verifyData?.data?.status)

    if (!verifyData.status) {
      console.error('❌ Paystack status is false')
      return appRedirect('/checkout?error=payment_failed')
    }

    if (verifyData.data.status !== 'success') {
      console.error('❌ Payment status not success:', verifyData.data.status)
      return appRedirect('/checkout?error=payment_failed')
    }

    console.log('✅ Payment verified with Paystack')

    // ── Duplicate check via Payment model ──────────────────────────────────
    // Check if a payment with this transaction reference already exists
    console.log('\n🔄 STEP 2: Checking for Duplicate Payment')
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        transactionId: reference 
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        }
      }
    })

    if (existingPayment && existingPayment.order) {
      console.log('⚠️ Payment already exists for this reference. Order:', existingPayment.order.orderNumber)
      return appRedirect(`/orders?payment=success&order=${existingPayment.order.orderNumber}`)
    }

    console.log('✅ No duplicate found — proceeding to create order')

    // ── Metadata ───────────────────────────────────────────────────────────
    console.log('\n📋 STEP 3: Extracting Metadata')
    const meta = verifyData.data.metadata as {
      userId: string
      cartItems: {
        productId: string
        name: string
        price: number
        quantity: number
        category: string
        sellerId: string
        sellerName: string
        orderNote?: string
      }[]
      deliveryFee: number
      fees: ReturnType<typeof calculateFees>
    }

    console.log('📋 Metadata received:', JSON.stringify({
      userId: meta?.userId,
      itemCount: meta?.cartItems?.length,
      deliveryFee: meta?.deliveryFee,
    }))

    if (!meta || !meta.userId || !meta.cartItems || meta.cartItems.length === 0) {
      console.error('❌ Invalid or missing metadata:', JSON.stringify(meta))
      return appRedirect('/checkout?error=invalid_metadata')
    }

    console.log('✅ Metadata valid — User:', meta.userId, '| Items:', meta.cartItems.length)

    // ── Fetch buyer ────────────────────────────────────────────────────────
    console.log('\n👤 STEP 4: Fetching Buyer')
    const buyer = await prisma.user.findUnique({
      where: { id: meta.userId },
      select: {
        id: true, name: true, email: true,
        hostelName: true, roomNumber: true,
        phone: true, landmark: true,
      },
    })

    if (!buyer) {
      console.error('❌ Buyer not found for userId:', meta.userId)
      return appRedirect('/checkout?error=user_not_found')
    }

    console.log('✅ Buyer found:', buyer.name)

    // ── Validate products ──────────────────────────────────────────────────
    console.log('\n📦 STEP 5: Validating Products')
    for (const item of meta.cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, quantity: true, isActive: true },
      })

      if (!product) {
        console.error('❌ Product not found:', item.productId)
        return appRedirect(`/checkout?error=product_not_found&product=${encodeURIComponent(item.name)}`)
      }
      if (!product.isActive) {
        console.error('❌ Product inactive:', item.name)
        return appRedirect(`/checkout?error=product_inactive&product=${encodeURIComponent(item.name)}`)
      }
      if (product.quantity < item.quantity) {
        console.error('❌ Insufficient stock for:', item.name, '| has:', product.quantity, '| needs:', item.quantity)
        return appRedirect(`/checkout?error=out_of_stock&product=${encodeURIComponent(item.name)}`)
      }
      console.log(`✅ ${item.name}: OK (stock: ${product.quantity})`)
    }

    // ── Create orders ──────────────────────────────────────────────────────
    console.log('\n💰 STEP 6: Creating Orders')
    const subtotal = meta.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const fees = meta.fees || calculateFees(subtotal, meta.deliveryFee)

    console.log('💰 Fees:', JSON.stringify(fees))

    const orders = await createOrders(meta.cartItems, buyer, fees, reference)

    if (!orders || orders.length === 0) {
      console.error('❌ createOrders returned empty result')
      return appRedirect('/checkout?error=order_creation_failed')
    }

    console.log('✅ Orders created:', orders.map(o => o.orderNumber))

    // ── Fire notifications (non-blocking) ─────────────────────────────────
    console.log('\n🔔 STEP 7: Sending Notifications')

    const sellerMap = new Map<string, {
      orderId: string
      orderNumber: string
      orderNote?: string
      itemsList: string
    }>()

    for (const order of orders) {
      if (order.sellerId && !sellerMap.has(order.sellerId)) {
        const matchingItem = meta.cartItems.find(i => i.sellerId === order.sellerId)
        const sellerItems = meta.cartItems.filter(i => i.sellerId === order.sellerId)
        const itemsList = sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', ')
        sellerMap.set(order.sellerId, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderNote: matchingItem?.orderNote,
          itemsList,
        })
      }
    }

    // Fire without await — never block the redirect
    Promise.allSettled([

      // 1. In-app bell notification for buyer
      import('@/lib/notification').then(({ notifyOrderPlaced: createBuyerNotif }) =>
        createBuyerNotif(
          orders[0].id,
          buyer.id,
          orders[0].sellerId,
          orders[0].orderNumber,
          meta.cartItems.map(i => i.name).join(', ')
        )
      ),

      // 2. Push notification for buyer
      notifyOrderPlaced(buyer.id, orders[0].orderNumber),

      // 3. Notify each seller
      ...Array.from(sellerMap.entries()).map(([sellerId, { orderId, orderNumber, orderNote, itemsList }]) =>
        notifyNewOrderWithNote(sellerId, orderId, orderNumber, orderNote, buyer.name, itemsList)
      ),

    ]).then(results => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`Notification ${i} failed:`, r.reason)
        else console.log(`✅ Notification ${i} sent`)
      })
    })

    const firstOrderNumber = orders[0]?.orderNumber || orders[0]?.id

    console.log('\n🎉 SUCCESS — Redirecting to Orders Page')
    console.log('Order:', firstOrderNumber, '| Total orders:', orders.length)
    console.log('═'.repeat(70))

    return appRedirect(`/orders?payment=success&order=${firstOrderNumber}&count=${orders.length}`)

  } catch (error) {
    console.error('\n💥 FATAL ERROR in payment verification:')
    console.error(error instanceof Error ? error.message : error)
    if (error instanceof Error) console.error(error.stack)
    return appRedirect('/checkout?error=verification_failed&reason=exception')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seller notification: 2 separate in-app bells + push + email
// ─────────────────────────────────────────────────────────────────────────────
async function notifyNewOrderWithNote(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  orderNote: string | undefined,
  buyerName: string,
  itemsList: string,
) {
  const hasNote = orderNote && orderNote.trim().length > 0

  const { subject, html } = buildSellerOrderEmail(orderNumber, buyerName, orderNote)

  const { notifyNewOrder } = await import('@/lib/push/sendPushNotification')
  const { sendEmail } = await import('@/lib/email/sendEmail')
  const { prisma: db } = await import('@/lib/prisma')
  const { createNotification } = await import('@/lib/notification')

  const seller = await db.user.findUnique({
    where: { id: sellerId },
    select: { email: true },
  })

  await Promise.allSettled([

    createNotification({
      userId: sellerId,
      type: 'ORDER_PLACED',
      title: '🛒 New Order Received!',
      message: `You have a new order (#${orderNumber}) for ${itemsList}`,
      orderId,
      metadata: { orderNumber, buyerName, itemsList },
    }),

    ...(hasNote ? [
      createNotification({
        userId: sellerId,
        type: 'ORDER_PLACED',
        title: '📝 Note from Buyer',
        message: `For order #${orderNumber}: "${orderNote}"`,
        orderId,
        metadata: { orderNumber, orderNote },
      }),
    ] : []),

    notifyNewOrder(sellerId, orderNumber),

    ...(hasNote && seller?.email ? [
      sendEmail({ to: seller.email, subject, html })
    ] : []),

  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Email template for seller
// ─────────────────────────────────────────────────────────────────────────────
function buildSellerOrderEmail(orderNumber: string, buyerName: string, orderNote?: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bata-mart.vercel.app'
  const hasNote = orderNote && orderNote.trim().length > 0

  const noteBlock = hasNote
    ? `
      <div style="margin:20px 0;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">
          📝 Customer's Note to You
        </p>
        <p style="margin:0;font-size:15px;color:#78350f;line-height:1.6;font-style:italic;">
          "${orderNote}"
        </p>
      </div>
    `
    : ''

  return {
    subject: `🎉 New Order #${orderNumber} — BATAMART`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
     <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:28px;font-weight:800;color:#111827;letter-spacing:-1px;">BATAMART</span>
              <span style="font-size:12px;color:#6b7280;display:block;margin-top:2px;">UNIZIK Campus Marketplace</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <p style="font-size:32px;margin:0 0 8px;">🎉</p>
              <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">New Order Received!</h2>
              <p style="font-size:15px;color:#6b7280;margin:0 0 4px;">
                <strong style="color:#111827;">${buyerName}</strong> just placed order
                <strong style="color:#111827;">#${orderNumber}</strong>.
              </p>
              <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
                Please confirm it as soon as possible so a rider can be assigned.
              </p>
              ${noteBlock}
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;"/>
              <p style="font-size:13px;color:#9ca3af;margin:0 0 20px;">
                ⚠️ Orders not confirmed within 30 minutes may be auto-cancelled.
              </p>
              <a href="${APP_URL}/orders/sales"
                 style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;">
                Confirm Order Now →
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                BATAMART — UNIZIK Campus Marketplace · Awka, Anambra State
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}