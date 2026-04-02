// app/api/products/[id]/view/route.ts
// Called when a user opens a product page.
// Increments viewCount on the product (used by the feed scoring algorithm).
// Fire-and-forget from the client — always returns 200 so it never blocks UX.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { id } = params
    if (!id) return NextResponse.json({ ok: false }, { status: 400 })

    // Don't count the seller viewing their own product
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true },
    })

    if (!product || product.sellerId === user.id) {
      return NextResponse.json({ ok: true }) // silent skip
    }

    await prisma.product.update({
      where: { id },
      data:  { viewCount: { increment: 1 } },
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let this break the user's experience
    return NextResponse.json({ ok: true })
  }
}