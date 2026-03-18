'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

// Remove the splash-pending class so page content becomes visible
function unblockPage() {
  document.documentElement.classList.remove('splash-pending')
}

export default function SplashScreen() {
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

    // Android has its own native splash — unblock page immediately
    if (isAndroid) {
      unblockPage()
      return
    }

    const shouldShowAppSplash =
      isAppMode && !sessionStorage.getItem('batamart_splash_app')

    const shouldShowBrowserSplash =
      !isAppMode &&
      pathname === '/marketplace' &&
      !sessionStorage.getItem('batamart_splash_browser')

    // No splash needed — unblock immediately
    if (!shouldShowAppSplash && !shouldShowBrowserSplash) {
      unblockPage()
      return
    }

    // Mark session so splash doesn't repeat
    if (shouldShowAppSplash)     sessionStorage.setItem('batamart_splash_app', '1')
    if (shouldShowBrowserSplash) sessionStorage.setItem('batamart_splash_browser', '1')

    // Preload logo fully before showing anything
    preloadImage('/BATAMART - logo.png').then(() => {
      setVisible(true)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('in'))
      })

      const outTimer = setTimeout(() => setPhase('out'), 2500)

      const doneTimer = setTimeout(() => {
        setVisible(false)
        // Unblock the page — content becomes visible after splash
        unblockPage()
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

  if (!visible) return null

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
      phase === 'in'   ? 'translateY(0)'
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
    <div
      id="__splash_screen"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
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