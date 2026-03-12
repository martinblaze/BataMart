'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 30_000 // check every 30 seconds

/**
 * useSuspensionGuard
 *
 * Polls /api/auth/me every 30 seconds for any logged-in user.
 * If the server returns 403 with { suspended: true }, it means the admin
 * suspended this account while they were active. We immediately:
 *   1. Clear all auth data from localStorage
 *   2. Dispatch 'auth-change' so any listening components update
 *   3. Redirect to /login with a query param so the login page can show
 *      a suspension message instead of a generic "logged out" message
 *
 * Drop this hook in a client component that wraps the whole app.
 * It does nothing if no token is present (unauthenticated users).
 */
export function useSuspensionGuard() {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem('token')

      // No token = not logged in, nothing to guard
      if (!token) return

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          // Don't cache — we always want a fresh check
          cache: 'no-store',
        })

        if (response.status === 403) {
          const data = await response.json()

          if (data.suspended) {
            // ── Force logout ──────────────────────────────────────────────
            localStorage.removeItem('token')
            localStorage.removeItem('userName')
            localStorage.removeItem('userRole')

            // Tell any components listening (e.g. Navbar) to update immediately
            window.dispatchEvent(new Event('auth-change'))

            // Build a descriptive redirect URL so login page can show context
            const params = new URLSearchParams()
            params.set('suspended', '1')
            if (data.reason) params.set('reason', data.reason)
            if (data.until) params.set('until', data.until)

            router.replace(`/login?${params.toString()}`)
          }
        }
      } catch {
        // Network error — silently skip, will retry on next interval
      }
    }

    // Run once immediately on mount, then on interval
    check()
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router])
}