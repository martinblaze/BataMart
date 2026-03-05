// app/api/wallet/verify-pin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        withdrawalPin: true,
        withdrawalPinAttempts: true,
        withdrawalPinLockedUntil: true,
      },
    })

    if (!dbUser?.withdrawalPin) {
      return NextResponse.json(
        { error: 'PIN_NOT_SET', message: 'No withdrawal PIN set for this account.' },
        { status: 400 }
      )
    }

    // Check if locked
    if (dbUser.withdrawalPinLockedUntil && dbUser.withdrawalPinLockedUntil > new Date()) {
      const minutes = Math.ceil(
        (dbUser.withdrawalPinLockedUntil.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: `Too many failed attempts. PIN locked for ${minutes} more minute${minutes !== 1 ? 's' : ''}.`,
        },
        { status: 429 }
      )
    }

    const isMatch = await bcrypt.compare(pin, dbUser.withdrawalPin)

    if (!isMatch) {
      const newAttempts = (dbUser.withdrawalPinAttempts ?? 0) + 1
      const shouldLock = newAttempts >= MAX_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          withdrawalPinAttempts: newAttempts,
          withdrawalPinLockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : null,
        },
      })

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - newAttempts)
      return NextResponse.json(
        {
          error: shouldLock
            ? 'Too many failed attempts. PIN locked for 15 minutes.'
            : `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        },
        { status: 401 }
      )
    }

    // ✅ Correct PIN — reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        withdrawalPinAttempts: 0,
        withdrawalPinLockedUntil: null,
      },
    })

    return NextResponse.json({ success: true, message: 'PIN verified successfully' })
  } catch (error) {
    console.error('[verify-pin]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}