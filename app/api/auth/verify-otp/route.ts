export const dynamic = 'force-dynamic'
// app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTP, generateToken, formatPhone } from '@/lib/auth/auth'
import { generateUniqueReferralCode } from '@/lib/referral/generateReferralCode'

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Allows 10 verify attempts per IP per 15 minutes.
// This prevents OTP brute-force without locking out legitimate retries.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(key: string): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSecs: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfterSecs: 0 }
}

setInterval(() => {
  const now = Date.now()
  Array.from(rateLimitMap.entries()).forEach(([key, val]) => {
    if (now > val.resetAt) rateLimitMap.delete(key)
  })
}, 60 * 1000)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { allowed, retryAfterSecs } = checkRateLimit(`verify-otp:${ip}`)
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Please wait ${Math.ceil(retryAfterSecs / 60)} minute(s) before trying again.` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSecs) },
        }
      )
    }

    const body = await request.json()
    const { phone, email, code, otpCode, name } = body

    const otpValue = otpCode || code

    if (!otpValue) {
      return NextResponse.json({ error: 'OTP code is required' }, { status: 400 })
    }

    const identifier = phone ? formatPhone(phone) : email

    if (!identifier) {
      return NextResponse.json(
        { error: 'Phone or email is required' },
        { status: 400 }
      )
    }

    const isValid = await verifyOTP(identifier, otpValue)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // ✅ Signup flow (no name) — just confirm OTP is valid, user created later in signup-with-password
    if (!name) {
      return NextResponse.json({ success: true })
    }

    // Login / other flows that pass a name — find or create user
    let user = await prisma.user.findFirst({
      where: phone ? { phone: formatPhone(phone) } : { email },
    })

    if (!user) {
      const referralCode = await generateUniqueReferralCode()

      user = await prisma.user.create({
        data: {
          phone: phone ? formatPhone(phone) : undefined,
          email: email || undefined,
          name,
          password: '',
          referralCode,
        },
      })
    }

    const token = generateToken(user.id, user.phone || user.email || '')

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        hostelName: user.hostelName,
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}