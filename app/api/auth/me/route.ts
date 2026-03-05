import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const extraRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        faceDescriptor: true,
        withdrawalPin: true,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        matricNumber: user.matricNumber,
        profilePhoto: user.profilePhoto,
        role: user.role,
        hostelName: user.hostelName,
        roomNumber: user.roomNumber,
        landmark: user.landmark,
        trustLevel: user.trustLevel,
        rating: user.avgRating,
        totalRatings: user.totalReviews,
        completedOrders: user.completedOrders,
        pendingBalance: user.pendingBalance,
        availableBalance: user.availableBalance,
        penaltyPoints: user.penaltyPoints,
        isSuspended: user.isSuspended,
        suspendedUntil: user.suspendedUntil,
        isRiderVerified: user.isRiderVerified,
        isAvailable: user.isAvailable,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // ✅ Security flags
        hasFaceId: !!extraRow?.faceDescriptor,
        hasWithdrawalPin: !!extraRow?.withdrawalPin,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 })
  }
}