export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { getCategoryAttributes } from '@/lib/category-attributes'
import { prisma } from '@/lib/prisma'
import { getVariantFields } from '@/lib/variants'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoryKey = searchParams.get('categoryKey')
    const subcategoryKey = searchParams.get('subcategoryKey')

    if (!categoryKey) {
      return NextResponse.json({ error: 'categoryKey is required' }, { status: 400 })
    }

    const attributes = await getCategoryAttributes(categoryKey, subcategoryKey)
    const variantFieldMap = new Map(
      (subcategoryKey ? getVariantFields(categoryKey, subcategoryKey) : []).map((f) => [f.key, f.suggestions || []]),
    )

    const hydrated = await Promise.all(
      attributes.map(async (attr) => {
        const existingOptions = Array.isArray(attr.options) ? (attr.options as string[]) : []
        if (!['select', 'multi_select'].includes(attr.type) || existingOptions.length > 0) {
          return attr
        }

        const learned = await prisma.attributeValueStats.findMany({
          where: { categoryKey, key: attr.key },
          orderBy: { count: 'desc' },
          take: 20,
          select: { value: true },
        })

        const learnedOptions = learned.map((x) => x.value).filter(Boolean)
        const variantFallback = variantFieldMap.get(attr.key) || []
        const defaultBrandFallback =
          attr.key === 'brand'
            ? ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Xiaomi', 'Dell', 'HP', 'Lenovo', 'Nike', 'Adidas']
            : []

        const merged = Array.from(new Set([...learnedOptions, ...variantFallback, ...defaultBrandFallback]))
        return { ...attr, options: merged }
      }),
    )

    return NextResponse.json({ success: true, attributes: hydrated })
  } catch (error) {
    console.error('GET /api/category-attributes error:', error)
    return NextResponse.json({ error: 'Failed to load category attributes' }, { status: 500 })
  }
}
