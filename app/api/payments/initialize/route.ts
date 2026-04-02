// app/api/payments/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'
import { notifyOrderPlaced } from '@/lib/notification'

export const dynamic = 'force-dynamic'

// ============================================================
// STANDARDIZED FEE STRUCTURE
// calculateFees is imported by the verify route — both sides
// must always compute fees identically from the same function.
// ============================================================
export function calculateFees(subtotal: number, deliveryFee: number = 800) {
  const PLATFORM_RATE = 0.05
  const RIDER_SHARE = 560
  // ₦120 goes to referrer (50% of old ₦240), ₦120 stays with platform
  const PLATFORM_DELIVERY_CUT = 120

  const platformFeeFromProducts = subtotal * PLATFORM_RATE
  const sellerShare = subtotal - platformFeeFromProducts
  const riderShare = RIDER_SHARE
  const platformTotal = platformFeeFromProducts + PLATFORM_DELIVERY_CUT
  const totalAmount = subtotal + deliveryFee

  return {
    subtotal,
    deliveryFee,
    totalAmount,
    sellerShare,
    riderShare,
    platformTotal,
    platformFeeFromProducts,
    PLATFORM_DELIVERY_CUT,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, cartItems, deliveryFee = 800 } = body

    type CartItem = {
      productId: string
      name: string
      price: number
      quantity: number
      category: string
      sellerId: string
      sellerName: string
      orderNote?: string
    }

    let items: CartItem[] = []

    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      // Server always re-fetches price from DB — client-supplied price is IGNORED
      for (const item of cartItems) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { seller: true },
        })
        if (!product) {
          return NextResponse.json({ error: `Product not found: ${item.name}` }, { status: 404 })
        }
        if (!product.isActive || product.quantity < item.quantity) {
          return NextResponse.json({ error: `Product unavailable: ${product.name}` }, { status: 400 })
        }
        // Input length guard on order notes
        if (item.orderNote && String(item.orderNote).length > 300) {
          return NextResponse.json({ error: 'Order note must be under 300 characters' }, { status: 400 })
        }
        items.push({
          productId: product.id,
          name: product.name,
          price: product.price, // ← always from DB, never from client
          quantity: item.quantity,
          category: product.category,
          sellerId: product.sellerId,
          sellerName: product.seller.name,
          orderNote: item.orderNote,
        })
      }
    } else if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { seller: true },
      })
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      if (!product.isActive || product.quantity < 1) {
        return NextResponse.json({ error: 'Product unavailable' }, { status: 400 })
      }
      items = [{
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
        sellerId: product.sellerId,
        sellerName: product.seller.name,
        orderNote: body.orderNote,
      }]
    } else {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    // Can't buy own product
    const ownProduct = items.find(i => i.sellerId === user.id)
    if (ownProduct) {
      return NextResponse.json({ error: 'You cannot buy your own product' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const fees = calculateFees(subtotal, deliveryFee)

    // APP_URL required
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL
    if (!APP_URL) {
      console.error('❌ NEXT_PUBLIC_APP_URL is not set!')
      return NextResponse.json(
        { error: 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set.' },
        { status: 500 }
      )
    }

    const reference = `BATAMART-${Date.now()}-${user.id.substring(0, 8)}`
    const callbackUrl = `${APP_URL.replace(/\/$/, '')}/api/payments/verify`

    console.log('💳 Initializing Paystack — reference:', reference, '| callback:', callbackUrl)

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email || `${user.id}@batamart.app`,
        amount: fees.totalAmount * 100, // kobo
        reference,
        callback_url: callbackUrl,
        metadata: {
          userId: user.id,
          cartItems: items,
          deliveryFee,
          fees,
        },
      }),
    })

    const paystackData = await paystackRes.json()

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData)
      return NextResponse.json(
        { error: paystackData.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    console.log('✅ Paystack initialized — reference:', reference)

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      deliveryFee: fees.deliveryFee,
      totalAmount: fees.totalAmount,
    })
  } catch (error) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// createOrders — called ONLY from the verify route after Paystack confirms
// the payment. Never call this directly from any other route.
// ══════════════════════════════════════════════════════════════════════════════
export async function createOrders(
  items: {
    productId: string
    name: string
    price: number
    quantity: number
    category: string
    sellerId: string
    sellerName: string
    orderNote?: string
  }[],
  user: {
    id: string
    hostelName?: string | null
    roomNumber?: string | null
    phone?: string | null
    landmark?: string | null
  },
  fees: ReturnType<typeof calculateFees>,
  paymentReference: string
) {
  console.log('📝 createOrders called — reference:', paymentReference)

  // Group items by seller so each seller gets their own Order record
  const sellerGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.sellerId]) acc[item.sellerId] = []
    acc[item.sellerId].push(item)
    return acc
  }, {})

  const createdOrders: Awaited<ReturnType<typeof prisma.order.create>>[] = []

  const notificationQueue: Array<{
    orderId: string
    buyerId: string
    sellerId: string
    orderNumber: string
    itemsList: string
  }> = []

  const outOfStockAlerts: Array<{
    sellerId: string
    productId: string
    productName: string
  }> = []

  for (const [sellerId, sellerItems] of Object.entries(sellerGroups)) {
    const orderSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const proportion = fees.subtotal > 0 ? orderSubtotal / fees.subtotal : 1
    const orderFees = calculateFees(orderSubtotal, Math.round(fees.deliveryFee * proportion))

    // FIX 1: Use crypto.randomUUID() instead of Date.now() + random suffix.
    // Date.now() has millisecond resolution — two sellers processing in the same
    // createOrders call can produce an identical timestamp, causing a unique
    // constraint violation on orderNumber. UUID is globally unique by design.
    const orderNumber = `BATAMART-${crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`
    const itemsList = sellerItems.map(i => `${i.name} (x${i.quantity})`).join(', ')

    console.log('🔨 Creating order:', orderNumber, 'for seller:', sellerId)

    try {
      const order = await prisma.$transaction(async (tx) => {
        // FIX 2: Only fetch pendingBalance — availableBalance was dead data here.
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { pendingBalance: true },
        })
        if (!seller) throw new Error(`Seller not found: ${sellerId}`)

        const orderNote = sellerItems
          .map(item => item.orderNote?.trim())
          .filter((note): note is string => Boolean(note && note.length > 0))
          .join(' | ') || null

        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            buyerId: user.id,
            sellerId,
            productId: sellerItems[0].productId,
            productPrice: Number(orderSubtotal),
            deliveryFee: Number(orderFees.deliveryFee),
            totalAmount: Number(orderFees.totalAmount),
            platformCommission: Number(orderFees.platformTotal),
            quantity: Number(sellerItems.reduce((sum, i) => sum + i.quantity, 0)),
            deliveryHostel: String(user.hostelName ?? ''),
            deliveryRoom: String(user.roomNumber ?? ''),
            deliveryPhone: String(user.phone ?? ''),
            deliveryLandmark: String(user.landmark ?? ''),
            isPaid: true,
            status: 'PENDING' as const,
            orderNote,
            payment: {
              create: {
                amount: Number(orderFees.totalAmount),
                method: 'CARD' as const,
                status: 'COMPLETED' as const,
                transactionId: paymentReference,
                paidAt: new Date(),
              },
            },
          },
        })

        // FIX 3: TOCTOU-safe stock decrement.
        // The verify route checks stock BEFORE calling createOrders, but two
        // concurrent buyers could both pass that check for the last unit and
        // then both enter this transaction. We guard against that by including
        // a `where` filter that only matches rows with sufficient stock.
        // If the updateMany affects 0 rows, the item was already snapped up —
        // we throw immediately so Prisma rolls back the whole transaction and
        // the second buyer gets a clean error rather than negative inventory.
        for (const item of sellerItems) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              quantity: { gte: Number(item.quantity) }, // only proceed if stock is still sufficient
            },
            data: { quantity: { decrement: Number(item.quantity) } },
          })

          if (updated.count === 0) {
            // Stock was snatched between the pre-check and this transaction.
            throw new Error(`STOCK_GONE:${item.productId}:${item.name}`)
          }

          // Check if stock just hit zero and deactivate if so.
          // We re-fetch only the fields we need — updateMany doesn't return rows.
          const afterUpdate = await tx.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, quantity: true },
          })

          if (afterUpdate && afterUpdate.quantity <= 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { isActive: false },
            })
            outOfStockAlerts.push({
              sellerId,
              productId: afterUpdate.id,
              productName: afterUpdate.name,
            })
          }
        }

        // Credit seller's pending (escrow) balance
        const sellerShare = Number(orderFees.sellerShare)
        const sellerPendingBalance = Number(seller.pendingBalance ?? 0)

        await tx.user.update({
          where: { id: sellerId },
          data: { pendingBalance: { increment: sellerShare } },
        })

        await tx.transaction.createMany({
          data: [
            {
              userId: sellerId,
              type: 'ESCROW',
              amount: sellerShare,
              description: `Escrow held for: ${itemsList} (Order: ${orderNumber})`,
              reference: `${orderNumber}-SELLER-ESCROW`,
              balanceBefore: sellerPendingBalance,
              balanceAfter: sellerPendingBalance + sellerShare,
            },
            {
              userId: user.id,
              type: 'DEBIT',
              amount: Number(orderFees.totalAmount),
              description: `Payment for ${itemsList} (Order: ${orderNumber})`,
              reference: `${orderNumber}-BUYER-PAYMENT`,
              balanceBefore: 0,
              balanceAfter: 0,
            },
          ],
        })

        return newOrder
      }, { timeout: 15000, maxWait: 20000 })

      createdOrders.push(order)
      notificationQueue.push({
        orderId: order.id,
        buyerId: user.id,
        sellerId,
        orderNumber,
        itemsList,
      })

      console.log('✅ Order created:', orderNumber)
    } catch (orderError) {
      console.error('❌ Failed to create order for seller', sellerId, orderError)
      throw orderError
    }
  }

  // Fire in-app notifications — non-blocking
  for (const n of notificationQueue) {
    notifyOrderPlaced(n.orderId, n.buyerId, n.sellerId, n.orderNumber, n.itemsList)
      .catch(err => console.error(`⚠️  Notification failed for ${n.orderNumber}:`, err))
  }

  // Fire out-of-stock alerts — non-blocking
  if (outOfStockAlerts.length > 0) {
    Promise.allSettled(
      outOfStockAlerts.map(alert =>
        notifySellerOutOfStock(alert.sellerId, alert.productId, alert.productName)
      )
    ).catch(() => { })
  }

  console.log('🎉 All orders created:', createdOrders.length)
  return createdOrders
}

// ─────────────────────────────────────────────────────────────────────────────
// Out-of-stock seller notification (fire-and-forget, all imports dynamic)
// ─────────────────────────────────────────────────────────────────────────────
async function notifySellerOutOfStock(sellerId: string, productId: string, productName: string) {
  const [notifMod, emailMod, prismaMod] = await Promise.all([
    import('@/lib/notification').catch(() => null),
    import('@/lib/email/sendEmail').catch(() => null),
    import('@/lib/prisma').catch(() => null),
  ])

  const seller = prismaMod
    ? await prismaMod.prisma.user.findUnique({
      where: { id: sellerId },
      select: { email: true, name: true },
    }).catch(() => null)
    : null

  const tasks: Promise<any>[] = []

  if (notifMod?.createNotification) {
    tasks.push(
      notifMod.createNotification({
        userId: sellerId,
        type: 'ORDER_PLACED',
        title: '⚠️ Product Out of Stock',
        message: `"${productName}" has sold out and been hidden from the marketplace. Restock it to make it visible again.`,
        metadata: { productId, productName },
      })
    )
  }

  if (seller?.email && emailMod?.sendEmail) {
    const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://batamart.com').replace(/\/$/, '')
    tasks.push(
      emailMod.sendEmail({
        to: seller.email,
        subject: `⚠️ "${productName}" is out of stock — BATAMART`,
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
              <p style="font-size:32px;margin:0 0 8px;">⚠️</p>
              <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Product Out of Stock</h2>
              <p style="font-size:15px;color:#6b7280;margin:0 0 16px;">
                Hi ${seller.name ?? 'Seller'}, your product <strong style="color:#111827;">"${productName}"</strong> has just sold out.
              </p>
              <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">
                  It has been automatically hidden from the marketplace to prevent buyers from ordering something you can't fulfil.
                </p>
              </div>
              <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
                To start selling again, go to your shop and restock this product. It will become visible again automatically once you add more quantity.
              </p>
              <a href="${APP_URL}/my-shop"
                 style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;">
                Restock Now →
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
      })
    )
  }

  await Promise.allSettled(tasks)
}