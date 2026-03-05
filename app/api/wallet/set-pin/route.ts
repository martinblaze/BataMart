// app/api/wallet/set-pin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pin } = await request.json()

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(pin, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        withdrawalPin: hashed,
        withdrawalPinAttempts: 0,
        withdrawalPinLockedUntil: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Withdrawal PIN set successfully' })
  } catch (error) {
    console.error('[set-pin]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}