'use client'

import { useSuspensionGuard } from '@/hooks/Usesuspensionguard'

/**
 * SuspensionGuard
 *
 * A thin client component whose only job is to run useSuspensionGuard().
 * RootLayout is a Server Component, so we can't call hooks there directly —
 * we drop this wrapper in instead. It renders nothing visible.
 */
export function SuspensionGuard() {
  useSuspensionGuard()
  return null
}
