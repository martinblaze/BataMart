export const dynamic = 'force-dynamic'
// app/api/admin/users/route.ts
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

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── Pagination params ──────────────────────────────────────────────────
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
    const skip  = (page - 1) * limit

    // ── Run count + fetch in parallel ──────────────────────────────────────
    const where = { role: { not: 'ADMIN' as const } }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          trustLevel: true,
          isSuspended: true,
          penaltyPoints: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              sellerOrders: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    // Normalise _count keys to match what the frontend expects
    const normalised = users.map(u => ({
      ...u,
      _count: {
        ordersAsBuyer:  u._count.orders,
        ordersAsSeller: u._count.sellerOrders,
        products:       u._count.products,
      },
    }))

    return NextResponse.json({ users: normalised, total, page, limit })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}