export const dynamic = 'force-dynamic'
// app/api/admin/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true
      }
    })

    return NextResponse.json({
      adminsFound: admins.length,
      admins,
      message: admins.length === 0 
        ? '❌ No admin found! Run the seed script.' 
        : '✅ Admin exists!'
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
} 
