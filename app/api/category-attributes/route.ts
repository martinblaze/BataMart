export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { getCategoryAttributes } from '@/lib/category-attributes'

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
    return NextResponse.json({ success: true, attributes })
  } catch (error) {
    console.error('GET /api/category-attributes error:', error)
    return NextResponse.json({ error: 'Failed to load category attributes' }, { status: 500 })
  }
}
