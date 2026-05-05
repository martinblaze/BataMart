export const dynamic = 'force-dynamic'
// app/api/auth/login-with-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, comparePassword } from '@/lib/auth/auth'
import { enforceJsonRequest, enforceSameOrigin } from '@/lib/security/request'

// ── In-memory rate limiter ─────────────────────────────────────────────────
const loginRateMap = new Map<string, { count: number; resetAt: number }>()
const LOGIN_LIMIT     = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSecs: number } {
  const now   = Date.now()
  const entry = loginRateMap.get(ip)

  if (!entry || now > entry.resetAt) {
    loginRateMap.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return { allowed: true, retryAfterSecs: 0 }
  }
  if (entry.count >= LOGIN_LIMIT) {
    return { allowed: false, retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfterSecs: 0 }
}

setInterval(() => {
  const now = Date.now()
  Array.from(loginRateMap.entries()).forEach(([key, val]) => {
    if (now > val.resetAt) loginRateMap.delete(key)
  })
}, 60_000)
// ──────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const jsonErr = enforceJsonRequest(request)
    if (jsonErr) return jsonErr
    const originErr = enforceSameOrigin(request)
    if (originErr) return originErr

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { allowed, retryAfterSecs } = checkLoginRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${Math.ceil(retryAfterSecs / 60)} minute(s) and try again.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // ── BLOCK RIDER ACCOUNTS from the main login ────────────────────────────
    // Riders have a separate login at /rider/login — they must never come through here.
    if (user.role === 'RIDER') {
      return NextResponse.json(
        {
          error: 'Rider accounts cannot log in here.',
          isRider: true,
        },
        { status: 403 }
      )
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    // Auto-lift expired suspension
    if (user.isSuspended && user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isSuspended: false, suspendedUntil: null, suspensionReason: null },
      })
      user.isSuspended = false
    }

    if (user.isSuspended) {
      return NextResponse.json(
        {
          error: 'Account suspended',
          suspended: true,
          reason: user.suspensionReason ?? 'Violation of platform terms',
          until: user.suspendedUntil ?? null,
        },
        { status: 403 }
      )
    }

    const token = generateToken(user.id, user.phone)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id:         user.id,
        name:       user.name,
        phone:      user.phone,
        email:      user.email,
        role:       user.role,
        hostelName: user.hostelName,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
