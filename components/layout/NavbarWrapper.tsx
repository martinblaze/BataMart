'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Suspense } from 'react'

function NavbarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAndroid = searchParams.get('android') === 'true'

  // Hide navbar completely on admin pages
  // Do NOT hide on '/' anymore — Navbar itself handles what to show per context
  const hideNav = pathname?.startsWith('/admin') ||
    pathname?.startsWith('/admin-login')

  if (hideNav) return null

  // Android WebView: Navbar returns null internally, but we still
  // render it so the isAndroid check inside Navbar.tsx can fire.
  // No spacer needed — Android native nav handles layout.
  if (isAndroid) return <Navbar />

  // All other contexts: Navbar handles its own internal spacers
  return <Navbar />
}

export function NavbarWrapper() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  )
}