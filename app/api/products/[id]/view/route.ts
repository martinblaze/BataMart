// app/api/products/[id]/view/route.ts
//
// Increments viewCount and re-evaluates hot status when threshold is crossed.
// Debounced: same user can only add 1 view per product per 30 minutes.
// Sellers viewing their own products are ignored.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { updateHotStatus } from '@/lib/marketPrice/engine'

const viewDebounce = new Map<string, number>()
const DEBOUNCE_MS = 30 * 60 * 1000 // 30 minutes
const HOT_VIEW_THRESHOLD = 15 // must match engine.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getUserFromRequest(request)
    const productId = params.id
    if (!productId) return NextResponse.json({ ok: true })

    if (user) {
      const key = `${user.id}:${productId}`
      const lastView = viewDebounce.get(key)
      const now = Date.now()

      if (lastView && now - lastView < DEBOUNCE_MS) {
        return NextResponse.json({ ok: true, skipped: true })
      }

      viewDebounce.set(key, now)

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { sellerId: true, viewCount: true, isHot: true },
      })
      if (!product) return NextResponse.json({ ok: true })
      if (product.sellerId === user.id) return NextResponse.json({ ok: true, skipped: true })

      const updated = await prisma.product.update({
        where: { id: productId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true, isHot: true },
      })

      // Re-evaluate hot only at the exact moment threshold is crossed
      const crossedThreshold =
        !product.isHot &&
        updated.viewCount >= HOT_VIEW_THRESHOLD &&
        product.viewCount < HOT_VIEW_THRESHOLD

      if (crossedThreshold) {
        setImmediate(() => {
          updateHotStatus(productId).catch(() => {})
        })
      }
    } else {
      // Anonymous view — just increment
      await prisma.product
        .update({
          where: { id: productId },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
