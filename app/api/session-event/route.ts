export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

const COVIEW_WINDOW_MS = 30 * 60 * 1000
const RAPID_DUPLICATE_MS = 45 * 1000
const EVENT_RETENTION_DAYS = 7

async function cleanupOldEvents() {
  const cutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  await prisma.userSessionEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  }).catch(() => {})
}

async function updateCoViewFromSession(sessionId: string, productId: string) {
  const recentEvents = await prisma.userSessionEvent.findMany({
    where: {
      sessionId,
      eventType: 'view',
      productId: { not: null },
      createdAt: { gte: new Date(Date.now() - COVIEW_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { productId: true, createdAt: true },
  })

  const previous = recentEvents.find((e) => e.productId && e.productId !== productId)
  if (!previous?.productId) return

  const msSincePrev = Date.now() - new Date(previous.createdAt).getTime()
  if (msSincePrev > COVIEW_WINDOW_MS) return

  const duplicateRapid = recentEvents.find(
    (e) => e.productId === productId && Date.now() - new Date(e.createdAt).getTime() < RAPID_DUPLICATE_MS,
  )
  if (duplicateRapid) return

  await prisma.$transaction([
    prisma.productCoView.upsert({
      where: { productId_relatedProductId: { productId: previous.productId, relatedProductId: productId } },
      update: { count: { increment: 1 } },
      create: { productId: previous.productId, relatedProductId: productId, count: 1 },
    }),
    prisma.productCoView.upsert({
      where: { productId_relatedProductId: { productId, relatedProductId: previous.productId } },
      update: { count: { increment: 1 } },
      create: { productId, relatedProductId: previous.productId, count: 1 },
    }),
  ]).catch(() => {})
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request).catch(() => null)
    const body = await request.json().catch(() => ({}))

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const eventType = typeof body.eventType === 'string' ? body.eventType.trim().toLowerCase() : ''
    const productId = typeof body.productId === 'string' ? body.productId.trim() : null
    const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null

    if (!sessionId || !eventType) {
      return NextResponse.json({ error: 'sessionId and eventType are required' }, { status: 400 })
    }

    if (!['view', 'click', 'search'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    await prisma.userSessionEvent.create({
      data: {
        userId: user?.id || null,
        sessionId,
        productId,
        eventType,
        meta: meta || undefined,
      },
    })

    if (eventType === 'view' && productId) {
      updateCoViewFromSession(sessionId, productId).catch(() => {})
    }
    cleanupOldEvents().catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('session-event error:', error)
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 })
  }
}

