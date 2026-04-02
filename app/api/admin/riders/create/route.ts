export const dynamic = 'force-dynamic'
// app/api/admin/riders/create/route.ts
// Admin-only endpoint to create rider accounts.
// The public /rider-signup page should be deleted or have its route removed.

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/auth'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token   = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== 'ADMIN') return null
    return decoded
  } catch {
    return null
  }
}

function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
  const suffix  = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

export async function POST(request: NextRequest) {
  // ── Auth: admin only ────────────────────────────────────────────────────
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, phone, email, password, universityId } = body

    // ── Validation ──────────────────────────────────────────────────────
    if (!name || !phone || !email || !password || !universityId) {
      return NextResponse.json(
        { error: 'Name, phone, email, password and university are all required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      )
    }

    // Verify university exists
    const university = await prisma.university.findUnique({ where: { id: universityId } })
    if (!university) {
      return NextResponse.json({ error: 'Invalid university selected' }, { status: 400 })
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Check duplicate phone
    const existingPhone = await prisma.user.findFirst({ where: { phone } })
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 })
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(name)
    let attempts = 0
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode(name)
      if (++attempts > 10) {
        referralCode = `RIDER${Date.now().toString(36).toUpperCase()}`
        break
      }
    }

    const hashedPassword = await hashPassword(password)

    // ── Create rider ────────────────────────────────────────────────────
    const rider = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password:        hashedPassword,
        role:            'RIDER',
        referralCode,
        universityId,
        isRiderVerified: true,  // Admin-created riders are pre-verified
        isAvailable:     true,
        // No idDocument needed — admin vouches for this rider
      },
    })

    return NextResponse.json({
      success: true,
      message: `Rider account created for ${name}`,
      rider: {
        id:           rider.id,
        name:         rider.name,
        email:        rider.email,
        phone:        rider.phone,
        universityId: rider.universityId,
      },
    })
  } catch (error) {
    console.error('Admin create rider error:', error)
    return NextResponse.json({ error: 'Failed to create rider account' }, { status: 500 })
  }
}