export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category  = searchParams.get('category')
    const hostel    = searchParams.get('hostel')
    const minPrice  = searchParams.get('minPrice')
    const maxPrice  = searchParams.get('maxPrice')
    const search    = searchParams.get('search')

    const where: any = {
      isActive: true,
      quantity: { gt: 0 },
    }

    if (category && category !== 'All') {
      where.category = category
    }

    if (hostel && hostel !== 'All') {
      where.hostelName = { contains: hostel, mode: 'insensitive' }
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Server-side keyword search across name, category, description
    if (search && search.trim()) {
      const tokens = search.trim().split(/\s+/).filter(Boolean)
      where.AND = tokens.map((token: string) => ({
        OR: [
          { name:        { contains: token, mode: 'insensitive' } },
          { category:    { contains: token, mode: 'insensitive' } },
          { description: { contains: token, mode: 'insensitive' } },
        ],
      }))
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avgRating: true,
            trustLevel: true,
            completedOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    })
  } catch (error) {
    console.error('Fetch products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({
        error: 'Only sellers can list products.'
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, price, images, category, quantity, hostelName, roomNumber, landmark } = body

    if (!name || !description || !price || !images || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (price <= 0) return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    if (!category) return NextResponse.json({ error: 'Please select a category' }, { status: 400 })

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        images,
        category,
        quantity: parseInt(quantity),
        hostelName: hostelName || user.hostelName || '',
        roomNumber: roomNumber || user.roomNumber || '',
        landmark: landmark || user.landmark || '',
        sellerId: user.id,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}