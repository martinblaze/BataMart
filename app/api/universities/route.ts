// app/api/universities/route.ts
// Public route — no auth needed. Returns all active universities for signup dropdown.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const universities = await prisma.university.findMany({
      where:   { isActive: true },
      select: {
        id:            true,
        name:          true,
        shortName:     true,
        slug:          true,
        location:      true,
        deliveryAreas: true,
        hostels:       true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ universities })
  } catch (error) {
    console.error('Fetch universities error:', error)
    return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 })
  }
}