export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOTP, sendEmailOTP } from '@/lib/auth/auth'
import { enforceJsonRequest, enforceSameOrigin } from '@/lib/security/request'

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Allows 5 OTP requests per IP per 15 minutes.
// For multi-instance deployments swap this for Redis (e.g. @upstash/ratelimit).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 5
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

// Periodically clear stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now()
  Array.from(rateLimitMap.entries()).forEach(([key, val]) => {
    if (now > val.resetAt) rateLimitMap.delete(key)
  })
}, 60 * 1000)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const jsonErr = enforceJsonRequest(request)
    if (jsonErr) return jsonErr
    const originErr = enforceSameOrigin(request)
    if (originErr) return originErr

    // Rate limit by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    const { allowed, retryAfterSecs } = checkRateLimit(`send-otp:${ip}`)
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${Math.ceil(retryAfterSecs / 60)} minute(s) before trying again.` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSecs) },
        }
      )
    }

    const body = await request.json()
    const { email, isLogin } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // For login: check user exists
    if (isLogin) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return NextResponse.json(
          { error: 'Account not found. Please sign up first.' },
          { status: 404 }
        )
      }
    } else {
      // For signup: check user doesn't already exist
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Account already exists. Please login instead.' },
          { status: 400 }
        )
      }
    }

    // Generate and save OTP
    const otpCode = await createOTP(email)

    // Send OTP via email (Resend in prod, console log in dev)
    const sent = await sendEmailOTP(email, otpCode)

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    )
  }
}
