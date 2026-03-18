'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Preload the logo image and resolve when fully loaded
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // resolve anyway so we never hang
    img.src = src
  })
}

export default function SplashScreen() {
  // ── Start as BLOCKING (true) on first render to prevent ANY flash ──────────
  // We immediately cover the screen, then decide if we actually need to show
  // the splash or just unblock instantly.
  const [blocking, setBlocking] = useState(true)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle')

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    const isAppParam = searchParams.get('app') === 'true'
    const isAndroid  = searchParams.get('android') === 'true'
    const isAppMode  = isStandalone || isAppParam

    // Android has its own native splash — unblock immediately, do nothing
    if (isAndroid) {
      setBlocking(false)
      return
    }

    const shouldShowAppSplash =
      isAppMode && !sessionStorage.getItem('batamart_splash_app')

    const shouldShowBrowserSplash =
      !isAppMode &&
      pathname === '/marketplace' &&
      !sessionStorage.getItem('batamart_splash_browser')

    // No splash needed — unblock immediately so page shows normally
    if (!shouldShowAppSplash && !shouldShowBrowserSplash) {
      setBlocking(false)
      return
    }

    // Mark session so it doesn't show again this session
    if (shouldShowAppSplash)     sessionStorage.setItem('batamart_splash_app', '1')
    if (shouldShowBrowserSplash) sessionStorage.setItem('batamart_splash_browser', '1')

    // ── Preload logo FIRST, then show splash ─────────────────────────────────
    // This ensures the logo is fully in memory before we display anything.
    // No half-loaded image, no flash of marketplace.
    preloadImage('/BATAMART - logo.png').then(() => {
      // Logo is ready — now show the splash
      setVisible(true)

      // Trigger fade-in animation on next paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('in'))
      })

      // At 2500ms → start fade-out
      const outTimer = setTimeout(() => setPhase('out'), 2500)

      // At 3000ms → hide splash, unblock page, redirect if needed
      const doneTimer = setTimeout(() => {
        setVisible(false)
        setBlocking(false)
        if (isAppMode && pathname === '/') {
          router.replace('/marketplace?app=true')
        }
      }, 3000)

      return () => {
        clearTimeout(outTimer)
        clearTimeout(doneTimer)
      }
    })
  }, [pathname, searchParams, router])

  // ── While blocking but not yet visible: solid white cover ─────────────────
  // This prevents ANY flash of the underlying page before splash is ready.
  if (blocking && !visible) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-white"
        aria-hidden="true"
      />
    )
  }

  // ── Splash not needed and not blocking ────────────────────────────────────
  if (!visible) return null

  // ── Splash animation ───────────────────────────────────────────────────────
  const logoStyle: React.CSSProperties = {
    opacity:   phase === 'in' ? 1 : 0,
    transform: phase === 'out' ? 'translateY(-8px)' : 'translateY(0)',
    transition:
      phase === 'in'
        ? 'opacity 700ms cubic-bezier(0.45,0,0.55,1) 200ms'
        : phase === 'out'
        ? 'opacity 400ms ease, transform 400ms ease'
        : 'none',
  }

  const textStyle: React.CSSProperties = {
    opacity:   phase === 'in' ? 1 : 0,
    transform:
      phase === 'in'  ? 'translateY(0)'
      : phase === 'out' ? 'translateY(-20px)'
      :                   'translateY(30px)',
    transition:
      phase === 'in'
        ? 'opacity 700ms cubic-bezier(0.45,0,0.55,1) 600ms, transform 700ms cubic-bezier(0.45,0,0.55,1) 600ms'
        : phase === 'out'
        ? 'opacity 400ms ease, transform 400ms ease'
        : 'none',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      {/* Logo — fully preloaded before this renders, no half-load */}
      <img
        src="/BATAMART - logo.png"
        alt="BataMart"
        style={{
          width: '280px',
          height: '120px',
          objectFit: 'contain',
          ...logoStyle,
        }}
      />
      {/* Text — slides up from 30px, matches Android animation */}
      <p
        style={{
          marginTop: '12px',
          color: '#1a3f8f',
          fontSize: '16px',
          fontWeight: 600,
          ...textStyle,
        }}
      >
        Campus Marketplace
      </p>
    </div>
  )
}