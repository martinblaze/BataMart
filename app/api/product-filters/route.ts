export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { getCategoryAttributes } from '@/lib/category-attributes'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!user.universityId) return NextResponse.json({ error: 'No university on user' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const categoryKey = searchParams.get('categoryKey')
    const subcategoryKey = searchParams.get('subcategoryKey')
    const search = searchParams.get('search')
    const q = searchParams.get('q')
    const queryText = (q || search || '').trim()

    const productWhere: any = {
      isActive: true,
      isDeleted: false,
      quantity: { gt: 0 },
      universityId: user.universityId,
    }
    if (categoryKey) productWhere.categoryKey = categoryKey
    if (subcategoryKey) productWhere.subcategoryKey = subcategoryKey
    if (queryText) {
      const tokens = queryText.substring(0, 100).split(/\s+/).filter(Boolean)
      productWhere.AND = tokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: 'insensitive' } },
          { description: { contains: token, mode: 'insensitive' } },
          { category: { contains: token, mode: 'insensitive' } },
          { subcategory: { contains: token, mode: 'insensitive' } },
          { categoryKey: { contains: token, mode: 'insensitive' } },
          { subcategoryKey: { contains: token, mode: 'insensitive' } },
          {
            attributeValues: {
              some: {
                OR: [
                  { key: { contains: token, mode: 'insensitive' } },
                  { label: { contains: token, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      }))
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        price: true,
        variantsEnabled: true,
        variants: {
          select: { combination: true },
        },
        attributeValues: {
          where: { filterable: true },
          select: { key: true, value: true },
        },
      },
    })

    const defs = categoryKey ? await getCategoryAttributes(categoryKey, subcategoryKey) : []
    const labelByKey = new Map(defs.map((d) => [d.key, d.label]))
    const typeByKey = new Map(defs.map((d) => [d.key, d.type]))

    const optionCount: Record<string, Map<string, number>> = {}
    const sourceByKey = new Map<string, 'attribute' | 'variant' | 'merged'>()
    let min = Number.POSITIVE_INFINITY
    let max = 0

    for (const p of products) {
      if (typeof p.price === 'number') {
        min = Math.min(min, p.price)
        max = Math.max(max, p.price)
      }
      for (const attr of p.attributeValues) {
        if (!optionCount[attr.key]) optionCount[attr.key] = new Map()
        if (!sourceByKey.has(attr.key)) sourceByKey.set(attr.key, 'attribute')
        const push = (val: string) => {
          const key = val.trim()
          if (!key) return
          optionCount[attr.key].set(key, (optionCount[attr.key].get(key) || 0) + 1)
        }
        if (Array.isArray(attr.value)) {
          for (const v of attr.value as unknown[]) push(String(v))
        } else {
          push(String(attr.value))
        }
      }
      for (const variant of p.variants || []) {
        const combo = (variant.combination || {}) as Record<string, unknown>
        for (const [rawKey, rawVal] of Object.entries(combo)) {
          const key = String(rawKey || '').trim()
          const value = String(rawVal || '').trim()
          if (!key || !value) continue
          if (!optionCount[key]) optionCount[key] = new Map()
          optionCount[key].set(value, (optionCount[key].get(value) || 0) + 1)
          const prev = sourceByKey.get(key)
          if (!prev) sourceByKey.set(key, 'variant')
          else if (prev !== 'variant') sourceByKey.set(key, 'merged')
        }
      }
    }

    const statRows = categoryKey
      ? await prisma.attributeValueStats.findMany({
          where: { categoryKey },
          select: { key: true, value: true, count: true },
          take: 5000,
        })
      : []
    const statMap = new Map(statRows.map((r) => [`${r.key}::${r.value}`, r.count]))

    const filters = Object.entries(optionCount).map(([key, counts]) => ({
      key,
      label: labelByKey.get(key) || key,
      type: typeByKey.get(key) || 'select',
      source: sourceByKey.get(key) || 'attribute',
      options: Array.from(counts.entries())
        .map(([value, count]) => ({ value, count, learnedCount: statMap.get(`${key}::${value}`) || 0 }))
        .sort((a, b) => (b.learnedCount - a.learnedCount) || (b.count - a.count))
        .map(({ value, count }) => ({ value, count })),
    }))

    return NextResponse.json({
      success: true,
      filters,
      price: {
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 0,
      },
    })
  } catch (error) {
    console.error('GET /api/product-filters error:', error)
    return NextResponse.json({ error: 'Failed to load product filters' }, { status: 500 })
  }
}
