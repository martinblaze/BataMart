// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_PIN_ATTEMPTS   = 5
const PIN_LOCK_DURATION  = 15 * 60 * 1000   // 15 minutes
const MIN_WITHDRAWAL     = 1_000             // ₦1,000
const MAX_WITHDRAWAL     = 500_000           // ₦500,000 per request
const WITHDRAW_COOLDOWN  = 30_000            // 30 seconds between requests per user

// ─────────────────────────────────────────────────────────────────────────────
// FIX #2 — Per-user rate limiter (in-memory, resets on server restart)
// For production at scale, replace with Redis via Upstash.
// This map stores the timestamp of each user's last successful withdrawal request.
// ─────────────────────────────────────────────────────────────────────────────
const lastWithdrawAttempt = new Map<string, number>()

// Periodically clean up stale entries so the map doesn't grow forever
setInterval(() => {
  const cutoff = Date.now() - WITHDRAW_COOLDOWN * 2
  Array.from(lastWithdrawAttempt.keys()).forEach((uid) => {
    if ((lastWithdrawAttempt.get(uid) ?? 0) < cutoff) lastWithdrawAttempt.delete(uid)
  })
}, 5 * 60 * 1000) // clean every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── FIX #2 — Rate limit check (per user) ──────────────────────────────
    const lastAttempt = lastWithdrawAttempt.get(user.id)
    if (lastAttempt && Date.now() - lastAttempt < WITHDRAW_COOLDOWN) {
      const secondsLeft = Math.ceil((WITHDRAW_COOLDOWN - (Date.now() - lastAttempt)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''} before requesting another withdrawal.` },
        { status: 429 }
      )
    }
    // Record the attempt timestamp immediately (before any async work)
    // This prevents a burst of concurrent requests from all slipping through
    // before the first one sets the timestamp.
    lastWithdrawAttempt.set(user.id, Date.now())

    const body = await request.json()
    const { amount, bankCode, accountNumber, accountName, pin } = body

    // ── FIX #3 — Input validation with min AND max amount ─────────────────
    if (
      !amount ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < MIN_WITHDRAWAL ||
      amount > MAX_WITHDRAWAL
    ) {
      // Clear the rate-limit timestamp so they can retry immediately after a
      // validation error (rate limiting should only penalise real requests)
      lastWithdrawAttempt.delete(user.id)
      return NextResponse.json(
        { error: `Withdrawal amount must be between ₦${MIN_WITHDRAWAL.toLocaleString()} and ₦${MAX_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      )
    }

    // Amount must be a whole naira value — no kobo fractions
    if (!Number.isInteger(amount)) {
      lastWithdrawAttempt.delete(user.id)
      return NextResponse.json(
        { error: 'Withdrawal amount must be a whole naira value' },
        { status: 400 }
      )
    }

    if (!bankCode || !accountNumber || !accountName) {
      lastWithdrawAttempt.delete(user.id)
      return NextResponse.json({ error: 'Bank details are required' }, { status: 400 })
    }

    // PIN must be sent with every withdrawal request — never trust a prior verify call
    if (!pin || !/^\d{6}$/.test(String(pin))) {
      lastWithdrawAttempt.delete(user.id)
      return NextResponse.json({ error: 'A valid 6-digit PIN is required' }, { status: 400 })
    }

    // Prevent bloat / injection via bank detail fields
    if (String(accountName).length > 100 || String(accountNumber).length > 20) {
      lastWithdrawAttempt.delete(user.id)
      return NextResponse.json({ error: 'Invalid bank details' }, { status: 400 })
    }

    // ── Fetch user record (single DB call) ────────────────────────────────
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id:                       true,
        name:                     true,
        availableBalance:         true,
        withdrawalPin:            true,
        withdrawalPinAttempts:    true,
        withdrawalPinLockedUntil: true,
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ── PIN required ───────────────────────────────────────────────────────
    if (!currentUser.withdrawalPin) {
      return NextResponse.json({ error: 'PIN_REQUIRED' }, { status: 403 })
    }

    // ── PIN lockout check ──────────────────────────────────────────────────
    if (currentUser.withdrawalPinLockedUntil && currentUser.withdrawalPinLockedUntil > new Date()) {
      const minutes = Math.ceil(
        (currentUser.withdrawalPinLockedUntil.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        { error: `Too many failed attempts. PIN locked for ${minutes} more minute${minutes !== 1 ? 's' : ''}.` },
        { status: 429 }
      )
    }

    // ── Verify PIN — always inside this route, never trust a prior call ────
    const isPinValid = await bcrypt.compare(String(pin), currentUser.withdrawalPin)

    if (!isPinValid) {
      const newAttempts = (currentUser.withdrawalPinAttempts ?? 0) + 1
      const shouldLock  = newAttempts >= MAX_PIN_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          withdrawalPinAttempts:    newAttempts,
          withdrawalPinLockedUntil: shouldLock
            ? new Date(Date.now() + PIN_LOCK_DURATION)
            : null,
        },
      })

      const attemptsLeft = Math.max(0, MAX_PIN_ATTEMPTS - newAttempts)
      return NextResponse.json(
        {
          error: shouldLock
            ? 'Too many failed attempts. PIN locked for 15 minutes.'
            : `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        },
        { status: 401 }
      )
    }

    // PIN correct — reset lockout counter immediately
    await prisma.user.update({
      where: { id: user.id },
      data: { withdrawalPinAttempts: 0, withdrawalPinLockedUntil: null },
    })

    // ─────────────────────────────────────────────────────────────────────
    // FIX #1 — ATOMIC BALANCE DEDUCTION
    //
    // We use updateMany with a WHERE availableBalance >= amount guard.
    // This is a single atomic DB operation — no race condition is possible.
    //
    // BEFORE (vulnerable):
    //   1. Read balance ← attacker reads ₦5,000
    //   2. Check balance >= amount ← passes for BOTH concurrent requests
    //   3. Call Paystack ← both succeed
    //   4. Deduct ← ₦10,000 leaves for ₦5,000 account
    //
    // AFTER (safe):
    //   1. updateMany WHERE balance >= amount AND id = userId
    //   2. If count === 0 → balance was insufficient (atomic, no race)
    //   3. Only if count === 1 → proceed to Paystack
    // ─────────────────────────────────────────────────────────────────────
    const balanceBefore = Number(currentUser.availableBalance)

    const deductResult = await prisma.user.updateMany({
      where: {
        id:               user.id,
        availableBalance: { gte: amount },  // atomic guard — this is the real balance check
      },
      data: {
        availableBalance: { decrement: amount },
      },
    })

    if (deductResult.count === 0) {
      // Either truly insufficient OR a concurrent withdrawal just won the race
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Balance successfully locked. Now call Paystack.
    // If Paystack fails from this point, we MUST refund (see catch block below).
    const transferReference = `WD-${Date.now()}-${user.id.substring(0, 8)}`
    let transferCode: string | null = null

    try {
      // Step 1: Create transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type:           'nuban',
          name:           accountName,
          account_number: accountNumber,
          bank_code:      bankCode,
          currency:       'NGN',
        }),
      })
      const recipientData = await recipientResponse.json()

      if (!recipientData.status) {
        // Refund before returning error
        await refundBalance(user.id, amount)
        return NextResponse.json(
          { error: recipientData.message || 'Failed to create transfer recipient' },
          { status: 400 }
        )
      }

      // Step 2: Initiate transfer
      const transferResponse = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source:    'balance',
          amount:    amount * 100, // kobo
          recipient: recipientData.data.recipient_code,
          reason:    `BATAMART withdrawal - ${accountName}`,
          reference: transferReference,
        }),
      })
      const transferData = await transferResponse.json()

      if (!transferData.status) {
        await refundBalance(user.id, amount)
        return NextResponse.json(
          { error: transferData.message || 'Transfer initiation failed' },
          { status: 400 }
        )
      }

      transferCode = transferData.data?.transfer_code ?? null

    } catch (paystackErr) {
      // Network error calling Paystack — refund the deducted balance
      console.error('Paystack network error during withdrawal:', paystackErr)
      await refundBalance(user.id, amount)
      return NextResponse.json(
        { error: 'Payment network error. Your balance has been restored. Please try again.' },
        { status: 503 }
      )
    }

    // ─────────────────────────────────────────────────────────────────────
    // FIX #4 + FIX #5 — Atomic ledger write + WithdrawalRequest + AuditLog
    //
    // All three DB writes happen in one transaction so a server crash
    // between any of them doesn't leave the books in a broken state.
    // ─────────────────────────────────────────────────────────────────────
    const balanceAfter = balanceBefore - amount
    const ip = request.headers.get('x-forwarded-for')
               ?? request.headers.get('x-real-ip')
               ?? 'unknown'

    await prisma.$transaction(async (tx) => {
      // Ledger entry (Transaction record)
      await tx.transaction.create({
        data: {
          userId:        user.id,
          type:          'WITHDRAWAL',
          amount,
          description:   `Withdrawal to ${accountName} — ${accountNumber.slice(-4).padStart(accountNumber.length, '*')}`,
          reference:     transferReference,
          balanceBefore,
          balanceAfter,
        },
      })

      // WithdrawalRequest record for admin visibility
      await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount,
          status: 'PROCESSING',
          bankDetails: {
            bankCode,
            accountNumber,
            accountName,
            transferReference,
            transferCode,
          },
        },
      })

      // FIX #5 — AuditLog entry for forensic trail
      await tx.auditLog.create({
        data: {
          userId:     user.id,
          action:     'WITHDRAWAL_INITIATED',
          entityType: 'WithdrawalRequest',
          entityId:   transferReference,
          newValue: {
            amount,
            bankCode,
            accountNumber: `****${accountNumber.slice(-4)}`, // masked
            accountName,
            transferReference,
            transferCode,
            balanceBefore,
            balanceAfter,
          },
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') ?? undefined,
        },
      })
    }, { timeout: 15_000, maxWait: 20_000 })

    return NextResponse.json({
      success:      true,
      message:      'Withdrawal initiated successfully',
      reference:    transferReference,
      transferCode,
    })

  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 })
  }
}

// ── Helper: restore balance if Paystack fails after the deduct step ───────────
async function refundBalance(userId: string, amount: number): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data:  { availableBalance: { increment: amount } },
    })
    console.log(`[withdraw] Refunded ₦${amount} to user ${userId} after Paystack failure`)
  } catch (err) {
    // Critical: balance was deducted but refund failed.
    // Log loudly so ops team can manually correct it.
    console.error(`[withdraw] CRITICAL: Failed to refund ₦${amount} to user ${userId}`, err)
  }
}