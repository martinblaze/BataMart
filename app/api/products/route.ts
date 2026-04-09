// app/api/products/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'

const DEFAULT_PAGE_SIZE = 40
const MAX_PAGE_SIZE     = 100

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.universityId) {
      return NextResponse.json(
        { error: 'No university associated with your account. Please contact support.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const hostel   = searchParams.get('hostel')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const search   = searchParams.get('search')

    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
    )
    const skip = (page - 1) * limit

    const where: any = {
      isActive:     true,
      quantity:     { gt: 0 },
      isDeleted:    false,
      universityId: user.universityId,
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

    if (search && search.trim()) {
      const tokens = search.trim().substring(0, 100).split(/\s+/).filter(Boolean)
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
              id:              true,
              name:            true,
              avgRating:       true,
              trustLevel:      true,
              completedOrders: true,
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
      success: true,
      products,
      count:   products.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      hasMore: skip + products.length < total,
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

    if (!user.universityId) {
      return NextResponse.json(
        { error: 'No university associated with your account.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      category,
      subcategory,
      quantity,
      images,
      hostelName,
      roomNumber,
      landmark,
    } = body

    if (!name || !price || !category || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name:        String(name).trim().substring(0, 200),
        description: description ? String(description).trim().substring(0, 5000) : '',
        price:       Number(price),
        category:    String(category),
        // subcategory is stored as a JSON field if it exists in schema,
        // otherwise appended to category string for backward compat
        // NOTE: Add `subcategory String?` to schema if not present
        ...(subcategory ? { subcategory: String(subcategory) } : {}),
        quantity:    Number(quantity),
        images:      Array.isArray(images) ? images : [],
        seller:      { connect: { id: user.id } },
        hostelName:  hostelName ? String(hostelName).trim() : (user.hostelName || ''),
        roomNumber:  roomNumber  ? String(roomNumber).trim()  : (user.roomNumber  || ''),
        landmark:    landmark    ? String(landmark).trim()    : (user.landmark    || ''),
        university:  { connect: { id: user.universityId } },
      },
    })

    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}