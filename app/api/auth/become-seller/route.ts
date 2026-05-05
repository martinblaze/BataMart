export const dynamic = 'force-dynamic'
// app/api/auth/become-seller/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { enforceJsonRequest, enforceSameOrigin } from '@/lib/security/request'

export async function POST(request: NextRequest) {
  try {
    const jsonErr = enforceJsonRequest(request)
    if (jsonErr) return jsonErr
    const originErr = enforceSameOrigin(request)
    if (originErr) return originErr

    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'RIDER' || user.role === 'ADMIN') {
      return NextResponse.json(
        { error: `Role ${user.role} cannot self-upgrade to SELLER` },
        { status: 403 }
      )
    }

    if (user.role === 'SELLER') {
      return NextResponse.json(
        { success: true, message: 'You are already a seller.' },
        { status: 200 }
      )
    }

    // Update user role to SELLER
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SELLER' },
    })

    return NextResponse.json({
      success: true,
      message: 'You are now a seller!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error('Become seller error:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}
