// app/api/test-db-speed/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const results: any[] = []
  
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test 1: Simple query
    const start1 = Date.now()
    await prisma.user.findFirst()
    const time1 = Date.now() - start1
    results.push({ test: 'Simple Query', time: `${time1}ms` })
    
    // Test 2: Count query
    const start2 = Date.now()
    await prisma.product.count()
    const time2 = Date.now() - start2
    results.push({ test: 'Count Query', time: `${time2}ms` })
    
    // Test 3: Complex query with relations
    const start3 = Date.now()
    await prisma.order.findFirst({
      include: { product: true, seller: true, buyer: true }
    })
    const time3 = Date.now() - start3
    results.push({ test: 'Complex Query', time: `${time3}ms` })
    
    // Test 4: Transaction
    const start4 = Date.now()
    await prisma.$transaction(async (tx) => {
      await tx.user.findFirst()
      await tx.product.findFirst()
      await tx.order.findFirst()
    })
    const time4 = Date.now() - start4
    results.push({ test: 'Transaction (3 queries)', time: `${time4}ms` })
    
    const total = time1 + time2 + time3 + time4
    const avg = Math.round(total / 4)
    
    return NextResponse.json({
      success: true,
      database: process.env.DATABASE_URL?.includes('pooler') ? 'Supabase Pooler' : 'Direct',
      region: process.env.DATABASE_URL?.match(/aws-\d+-([a-z-]+)/)?.[1] || 'Unknown',
      results,
      summary: {
        total: `${total}ms`,
        average: `${avg}ms`,
        verdict: avg < 100 ? '✅ Fast' : avg < 500 ? '⚠️ Okay' : '❌ Slow'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
