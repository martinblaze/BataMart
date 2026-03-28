export const dynamic = 'force-dynamic'
// app/api/auth/suspension-info/route.ts
//
// Called by the login page when ?suspended=1 is in the URL.
// Returns the real suspension reason and end date from the database,
// so this info cannot be spoofed via URL manipulation.
//
// Does NOT require an auth token — the user is logged out at this point.
// Instead it uses a short-lived signed "suspension token" passed as a
// query param, OR falls back to looking up by email in the request body.
// For simplicity we use a stateless approach: the login-with-password
// route already returns { suspended: true, reason, until } in its 403
// response, so the login page reads that directly. This endpoint exists
// as a safety fallback for the useSuspensionGuard hook redirect flow.

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Try to get the token from the Authorization header
    // The suspension guard clears the token AFTER redirecting,
    // so we read it from the header if the client sends it.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      // No token available — return a safe generic response
      return NextResponse.json(
        { isSuspended: true, reason: null, until: null },
        { status: 200 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { isSuspended: true, reason: null, until: null },
        { status: 200 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        isSuspended: true,
        suspensionReason: true,
        suspendedUntil: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { isSuspended: false },
        { status: 200 }
      )
    }

    // Auto-lift check
    if (user.isSuspended && user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { isSuspended: false, suspendedUntil: null, suspensionReason: null },
      })
      return NextResponse.json({ isSuspended: false }, { status: 200 })
    }

    return NextResponse.json({
      isSuspended: user.isSuspended,
      reason: user.suspensionReason ?? null,
      until: user.suspendedUntil ?? null,
    })
  } catch (error) {
    console.error('Suspension info error:', error)
    // Safe fallback — don't expose errors, just return generic
    return NextResponse.json(
      { isSuspended: true, reason: null, until: null },
      { status: 200 }
    )
  }
}