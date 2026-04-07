export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

function toNumberOrNull(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()
    const riderId = (searchParams.get('riderId') || '').trim()
    const orderId = (searchParams.get('orderId') || '').trim()

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
          rider: { select: { id: true, name: true, phone: true } },
          buyer: { select: { id: true, name: true, phone: true } },
          seller: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true, images: true, category: true } },
        },
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: 'ORDER_TRACKING',
          entityId: orderId,
          action: { in: ['RIDER_TRACKING_STARTED', 'RIDER_STATUS_CHECKPOINT', 'RIDER_LOCATION_UPDATE'] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          action: true,
          createdAt: true,
          newValue: true,
          userId: true,
        },
      })

      const points = logs
        .filter(log => log.action === 'RIDER_LOCATION_UPDATE')
        .map(log => {
          const payload = (log.newValue || {}) as any
          return {
            id: log.id,
            at: log.createdAt,
            lat: toNumberOrNull(payload.lat),
            lng: toNumberOrNull(payload.lng),
            accuracy: toNumberOrNull(payload.accuracy),
            heading: toNumberOrNull(payload.heading),
            speed: toNumberOrNull(payload.speed),
          }
        })
        .filter(point => point.lat != null && point.lng != null)

      const checkpoints = logs
        .filter(log => log.action !== 'RIDER_LOCATION_UPDATE')
        .map(log => {
          const payload = (log.newValue || {}) as any
          return {
            id: log.id,
            action: log.action,
            status: typeof payload.status === 'string' ? payload.status : null,
            note: typeof payload.note === 'string' ? payload.note : null,
            at: log.createdAt,
          }
        })

      return NextResponse.json({
        order,
        tracking: {
          points,
          checkpoints,
          latestPoint: points.length ? points[points.length - 1] : null,
          totalPings: points.length,
        },
      })
    }

    const where: any = {
      status: { in: ['DELIVERED', 'COMPLETED'] },
      riderId: { not: null },
    }

    if (riderId) where.riderId = riderId
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { rider: { name: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deliveredAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
          rider: { select: { id: true, name: true, phone: true } },
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, images: true, category: true } },
        },
      }),
    ])

    const orderIds = orders.map(o => o.id)
    const logs = orderIds.length
      ? await prisma.auditLog.findMany({
          where: {
            entityType: 'ORDER_TRACKING',
            entityId: { in: orderIds },
            action: { in: ['RIDER_TRACKING_STARTED', 'RIDER_STATUS_CHECKPOINT', 'RIDER_LOCATION_UPDATE'] },
          },
          select: { entityId: true, action: true, createdAt: true },
        })
      : []

    const summaryMap = new Map<string, { totalPings: number; checkpointCount: number; latestPingAt: Date | null }>()
    for (const log of logs) {
      const current = summaryMap.get(log.entityId) || { totalPings: 0, checkpointCount: 0, latestPingAt: null }
      if (log.action === 'RIDER_LOCATION_UPDATE') {
        current.totalPings += 1
        if (!current.latestPingAt || log.createdAt > current.latestPingAt) current.latestPingAt = log.createdAt
      } else {
        current.checkpointCount += 1
      }
      summaryMap.set(log.entityId, current)
    }

    const rows = orders.map(order => ({
      ...order,
      trackingSummary: summaryMap.get(order.id) || {
        totalPings: 0,
        checkpointCount: 0,
        latestPingAt: null,
      },
    }))

    return NextResponse.json({
      rows,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('admin rider-tracking error:', error)
    return NextResponse.json({ error: 'Failed to fetch rider tracking' }, { status: 500 })
  }
}
