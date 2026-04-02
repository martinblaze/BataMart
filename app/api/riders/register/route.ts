export const dynamic = 'force-dynamic'
// app/api/riders/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/auth'
import crypto from 'crypto'

// Upload ID document to Cloudinary
async function uploadIdToCloudinary(base64: string): Promise<string | null> {
  try {
    const cloudName  = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey     = process.env.CLOUDINARY_API_KEY
    const apiSecret  = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) return null

    const timestamp       = Math.round(Date.now() / 1000)
    const folder          = 'BATAMART-rider-ids'
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature       = crypto.createHash('sha1').update(signatureString).digest('hex')

    const formData = new FormData()
    formData.append('file',      base64)
    formData.append('api_key',   apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)
    formData.append('folder',    folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    const data = await response.json()
    return data.secure_url || null
  } catch {
    return null
  }
}

// Generate a unique referral code (same pattern as regular signup)
function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
  const suffix  = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ── FIXED: also destructure universityId ─────────────────────────────
    const { name, phone, email, password, idDocument, universityId } = body

    // Basic validation
    if (!name || !phone || !email || !password) {
      return NextResponse.json(
        { error: 'Name, phone, email and password are required' },
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

    if (!idDocument) {
      return NextResponse.json(
        { error: 'ID document is required' },
        { status: 400 }
      )
    }

    // ── FIXED: validate universityId ──────────────────────────────────────
    if (!universityId) {
      return NextResponse.json(
        { error: 'Please select your university' },
        { status: 400 }
      )
    }

    // Verify the university actually exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    })
    if (!university) {
      return NextResponse.json(
        { error: 'Invalid university selected' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check for duplicate phone
    const existingPhone = await prisma.user.findFirst({ where: { phone } })
    if (existingPhone) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    // Upload ID to Cloudinary (falls back to raw base64 if Cloudinary not configured)
    const idDocumentUrl = await uploadIdToCloudinary(idDocument)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate a unique referral code
    let referralCode = generateReferralCode(name)
    // Ensure uniqueness
    let attempts = 0
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode(name)
      if (++attempts > 10) {
        referralCode = `RIDER${Date.now().toString(36).toUpperCase()}`
        break
      }
    }

    // ── FIXED: save universityId on the rider record ──────────────────────
    const rider = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password:        hashedPassword,
        role:            'RIDER',
        referralCode,
        riderIdDocument: idDocumentUrl || idDocument,
        isRiderVerified: true,   // Auto-verified
        isAvailable:     true,
        universityId,            // ← THIS is what was missing
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Rider registration successful! You can now log in.',
      rider: {
        id:           rider.id,
        name:         rider.name,
        email:        rider.email,
        phone:        rider.phone,
        universityId: rider.universityId,
      },
    })
  } catch (error) {
    console.error('Rider registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}