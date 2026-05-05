export const dynamic = 'force-dynamic'
// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { enforceJsonRequest, enforceSameOrigin } from '@/lib/security/request'
import { checkRateLimitDistributed, getIpKey } from '@/lib/security/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const jsonErr = enforceJsonRequest(req)
    if (jsonErr) return jsonErr
    const originErr = enforceSameOrigin(req)
    if (originErr) return originErr

    const ip = getIpKey(req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'))
    const rate = await checkRateLimitDistributed(`admin:login:${ip}`, 10, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSecs) } }
      )
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find admin user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        phone: true
      }
    })

    // Check if user exists and is admin
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role,
        isAdmin: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Log admin access
    console.log(`Admin login: ${user.email} at ${new Date().toISOString()}`)

    return NextResponse.json({
      success: true,
      token,
      admin: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
