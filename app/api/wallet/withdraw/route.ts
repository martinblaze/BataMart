// app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const MAX_PIN_ATTEMPTS  = 5
const PIN_LOCK_DURATION = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, bankCode, accountNumber, accountName, pin } = body

    // ── Input validation ───────────────────────────────────────────────────
    if (!amount || typeof amount !== 'number' || amount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is ₦1,000' }, { status: 400 })
    }
    if (!bankCode || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Bank details are required' }, { status: 400 })
    }
    // PIN must be sent with every withdrawal request — never trust a prior verify call
    if (!pin || !/^\d{6}$/.test(String(pin))) {
      return NextResponse.json({ error: 'A valid 6-digit PIN is required' }, { status: 400 })
    }
    // Limit accountName and accountNumber length to prevent bloat
    if (String(accountName).length > 100 || String(accountNumber).length > 20) {
      return NextResponse.json({ error: 'Invalid bank details' }, { status: 400 })
    }

    // ── Fetch user record (single DB call) ────────────────────────────────
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id:                      true,
        availableBalance:        true,
        withdrawalPin:           true,
        withdrawalPinAttempts:   true,
        withdrawalPinLockedUntil:true,
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

    // ── Verify PIN — this MUST happen inside the withdraw route itself ─────
    // Never rely on a separate /verify-pin call. The frontend can be bypassed.
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

    // PIN correct — reset lockout counter
    await prisma.user.update({
      where: { id: user.id },
      data: { withdrawalPinAttempts: 0, withdrawalPinLockedUntil: null },
    })

    // ── Balance check ──────────────────────────────────────────────────────
    if (currentUser.availableBalance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // ── Production: Paystack Transfer API ─────────────────────────────────
    // Dev-mode bypass has been removed entirely. Use Paystack test keys in
    // local development so the real transfer flow is always exercised.
    const transferReference = `WD-${Date.now()}-${user.id.substring(0, 8)}`

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
      return NextResponse.json(
        { error: transferData.message || 'Transfer initiation failed' },
        { status: 400 }
      )
    }

    // Step 3: Deduct balance + create ledger entry atomically
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data:  { availableBalance: { decrement: amount } },
      })
      await tx.transaction.create({
        data: {
          userId:        user.id,
          type:          'WITHDRAWAL',
          amount,
          description:   `Withdrawal to ${accountName} (${accountNumber})`,
          reference:     transferReference,
          balanceBefore: currentUser.availableBalance,
          balanceAfter:  currentUser.availableBalance - amount,
        },
      })
    }, { timeout: 15000, maxWait: 20000 })

    return NextResponse.json({
      success:      true,
      message:      'Withdrawal initiated successfully',
      reference:    transferReference,
      transferCode: transferData.data.transfer_code,
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 })
  }
}