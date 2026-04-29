export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'
import { parseProductText } from '@/lib/product-parser'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const text = String(body?.text || '').trim()
    if (!text) return NextResponse.json({ parsed: {} })

    const parsed = await parseProductText(text)
    return NextResponse.json({ success: true, parsed })
  } catch (error) {
    console.error('POST /api/parse-product error:', error)
    return NextResponse.json({ error: 'Failed to parse product text' }, { status: 500 })
  }
}
