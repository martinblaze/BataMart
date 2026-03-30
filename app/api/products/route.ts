// app/api/products/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

// Maximum products returned per page — prevents returning thousands of rows
const DEFAULT_PAGE_SIZE = 40
const MAX_PAGE_SIZE     = 100

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const hostel   = searchParams.get('hostel')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const search   = searchParams.get('search')

    // ── Pagination ─────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
    )
    const skip = (page - 1) * limit

    const where: any = {
      isActive:  true,
      quantity:  { gt: 0 },
      isDeleted: false,
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
      const tokens = search.trim().substring(0, 100).split(/\s+/).filter(Boolean) // cap search length
      where.AND = tokens.map((token: string) => ({
        OR: [
          { name:        { contains: token, mode: 'insensitive' } },
          { category:    { contains: token, mode: 'insensitive' } },
          { description: { contains: token, mode: 'insensitive' } },
        ],
      }))
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id:             true,
              name:           true,
              avgRating:      true,
              trustLevel:     true,
              completedOrders:true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      success:  true,
      products,
      count:    products.length,
      total,
      page,
      pages:    Math.ceil(total / limit),
      hasMore:  skip + products.length < total,
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
      return NextResponse.json({ error: 'Only sellers can list products.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, price, images, category, quantity, hostelName, roomNumber, landmark } = body

    // ── Required field checks ──────────────────────────────────────────────
    if (!name || !description || !price || !images || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (price <= 0)          return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    if (!category)           return NextResponse.json({ error: 'Please select a category' }, { status: 400 })

    // ── Length limits — prevent DB bloat and abuse ─────────────────────────
    if (String(name).trim().length > 120) {
      return NextResponse.json({ error: 'Product name must be under 120 characters' }, { status: 400 })
    }
    if (String(description).trim().length > 2000) {
      return NextResponse.json({ error: 'Description must be under 2,000 characters' }, { status: 400 })
    }
    if (!Array.isArray(images) || images.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 images allowed' }, { status: 400 })
    }
    if (parseFloat(price) > 1_000_000) {
      return NextResponse.json({ error: 'Price cannot exceed ₦1,000,000' }, { status: 400 })
    }
    if (parseInt(quantity) > 10_000) {
      return NextResponse.json({ error: 'Quantity cannot exceed 10,000' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name:        name.trim(),
        description: description.trim(),
        price:       parseFloat(price),
        images,
        category,
        quantity:    parseInt(quantity),
        hostelName:  hostelName  || user.hostelName  || '',
        roomNumber:  roomNumber  || user.roomNumber  || '',
        landmark:    landmark    || user.landmark    || '',
        sellerId:    user.id,
        isActive:    true,
      },
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}