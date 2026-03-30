// app/api/auth/signup-with-password/route.ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth/auth'
import { generateUniqueReferralCode } from '@/lib/referral/generateReferralCode'
import { verifyOtpSessionToken } from '@/app/api/auth/verify-otp/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, otpSessionToken, role, phone, referralCode, universityId } = body

    // ── Field presence check ───────────────────────────────────────────────
    if (!email || !otpSessionToken || !password || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── University required ────────────────────────────────────────────────
    if (!universityId) {
      return NextResponse.json({ error: 'Please select your university or campus area' }, { status: 400 })
    }

    // ── Input length guards ────────────────────────────────────────────────
    if (String(name).trim().length < 2 || String(name).trim().length > 80) {
      return NextResponse.json({ error: 'Name must be between 2 and 80 characters' }, { status: 400 })
    }
    if (String(password).length < 6 || String(password).length > 128) {
      return NextResponse.json({ error: 'Password must be between 6 and 128 characters' }, { status: 400 })
    }

    // ── OTP session token verification ────────────────────────────────────
    const verifiedIdentifier = verifyOtpSessionToken(otpSessionToken)

    if (!verifiedIdentifier) {
      return NextResponse.json(
        { error: 'OTP session expired or invalid. Please verify your email again.' },
        { status: 400 }
      )
    }

    if (verifiedIdentifier.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match the verified address. Please restart the signup flow.' },
        { status: 400 }
      )
    }

    // ── Validate university exists ─────────────────────────────────────────
    const university = await prisma.university.findUnique({
      where:  { id: universityId },
      select: { id: true, isActive: true, name: true, shortName: true },
    })

    if (!university || !university.isActive) {
      return NextResponse.json({ error: 'Selected university is not available' }, { status: 400 })
    }

    // ── Duplicate account check ────────────────────────────────────────────
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    })

    if (existingUser) {
      const conflict = existingUser.email === email ? 'email' : 'phone number'
      return NextResponse.json(
        { error: `An account with this ${conflict} already exists` },
        { status: 400 }
      )
    }

    // ── Resolve referral code ──────────────────────────────────────────────
    let referredById: string | undefined = undefined

    if (referralCode && typeof referralCode === 'string') {
      const referrer = await prisma.user.findUnique({
        where:  { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true },
      })
      if (referrer) {
        referredById = referrer.id
      }
    }

    const hashedPassword  = await hashPassword(password)
    const newReferralCode = await generateUniqueReferralCode()

    const user = await prisma.user.create({
      data: {
        email,
        name:         name.trim(),
        phone,
        password:     hashedPassword,
        role:         role || 'BUYER',
        referralCode: newReferralCode,
        universityId: university.id,
        ...(referredById ? { referredById } : {}),
      },
    })

    const token = generateToken(user.id, user.phone)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id:           user.id,
        name:         user.name,
        phone:        user.phone,
        email:        user.email,
        role:         user.role,
        hostelName:   user.hostelName,
        referralCode: user.referralCode,
        universityId: user.universityId,
        university:   { name: university.name, shortName: university.shortName },
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}