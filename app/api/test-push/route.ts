// app/api/test-push/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const subscriptions = await prisma.pushSubscription.findMany({
    include: { user: { select: { email: true } } }
  })

  return NextResponse.json(
    subscriptions.map(s => ({
      user: s.user.email,
      endpoint: s.endpoint,
      createdAt: s.createdAt,
    }))
  )
}