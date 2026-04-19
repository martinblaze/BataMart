// app/api/admin/price-backfill/route.ts
// Admin-only route that queues a price check for every product that has
// never been checked OR whose last check is older than STALE_AFTER_DAYS.
//
// Runs products in small batches with a pause between each to avoid
// hammering external scrapers or blowing Vercel's function timeout.
//
// HOW TO TRIGGER:
//   curl -X POST https://yourdomain.com/api/admin/price-backfill \
//     -H "Authorization: Bearer <adminToken>" \
//     -H "Content-Type: application/json" \
//     -d '{"batchSize": 10, "staleDays": 1}'
//
// You can also run it from your admin dashboard — just add a button that
// calls this endpoint. It is safe to call multiple times; already-fresh
// products are skipped.

export const dynamic  = 'force-dynamic'
export const maxDuration = 300   // Vercel Pro: up to 300s; Hobby: keep batchSize ≤ 5

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import { runPriceCheck } from '@/app/api/price-check/route'

const DEFAULT_BATCH_SIZE  = 8     // products processed per run
const INTER_BATCH_PAUSE   = 1_500 // ms between products to avoid rate limiting
const DEFAULT_STALE_DAYS  = 1     // re-check anything older than this

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function POST(request: NextRequest) {
  try {
    // ── Auth: admin only ──────────────────────────────────────────────────────
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body        = await request.json().catch(() => ({}))
    const batchSize   = Math.min(50, Math.max(1, Number(body.batchSize)  || DEFAULT_BATCH_SIZE))
    const staleDays   = Math.max(0, Number(body.staleDays) || DEFAULT_STALE_DAYS)
    const staleAfter  = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

    // ── Find products that need a check ───────────────────────────────────────
    // Priority 1: never checked (lastCheckedAt is null)
    // Priority 2: stale (lastCheckedAt older than staleDays)
    // Skip deleted / inactive products
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isActive:  true,
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lt: staleAfter } },
        ],
      },
      select: {
        id:           true,
        name:         true,
        lastCheckedAt: true,
      },
      orderBy: [
        // null lastCheckedAt first — those are brand new / never checked
        { lastCheckedAt: 'asc' },
      ],
      take: batchSize,
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nothing to backfill — all products are up to date.',
        processed: 0,
      })
    }

    // ── Process each product ──────────────────────────────────────────────────
    const results: { id: string; name: string; status: string; source?: string; isDeal?: boolean; discountPercent?: number | null }[] = []

    for (const product of products) {
      try {
        const { success, source, result } = await runPriceCheck(product.id, 'internal')
        results.push({
          id:              product.id,
          name:            product.name,
          status:          success ? 'ok' : 'error',
          source,
          isDeal:          result?.isDeal,
          discountPercent: result?.discountPercent,
        })
      } catch (err) {
        results.push({ id: product.id, name: product.name, status: 'exception' })
      }

      // Pause between products to be respectful to external scrapers
      await delay(INTER_BATCH_PAUSE)
    }

    const hotCount = results.filter(r => r.isDeal).length

    return NextResponse.json({
      success:   true,
      processed: results.length,
      hotDeals:  hotCount,
      results,
      message:   `Processed ${results.length} products. ${hotCount} tagged as hot deals.`,
    })
  } catch (error) {
    console.error('[price-backfill] error:', error)
    return NextResponse.json({ error: 'Backfill failed', detail: String(error) }, { status: 500 })
  }
}

// GET — returns backfill status (how many products still need checking)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const staleAfter = new Date(Date.now() - DEFAULT_STALE_DAYS * 24 * 60 * 60 * 1000)

    const [neverChecked, stale, totalActive, hotDeals] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false, isActive: true, lastCheckedAt: null } }),
      prisma.product.count({ where: { isDeleted: false, isActive: true, lastCheckedAt: { lt: staleAfter } } }),
      prisma.product.count({ where: { isDeleted: false, isActive: true } }),
      prisma.product.count({ where: { isDeleted: false, isActive: true, isDeal: true } }),
    ])

    return NextResponse.json({
      success:      true,
      totalActive,
      neverChecked,
      stale,
      needsCheck:   neverChecked + stale,
      currentHotDeals: hotDeals,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}