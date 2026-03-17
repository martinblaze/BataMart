'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    const isAppParam = searchParams.get('app') === 'true'
    const isAppMode = isStandalone || isAppParam

    // ── APP MODE ──────────────────────────────────────────────────────────────
    // Show once per session. After splash → redirect to /marketplace?app=true
    // (only if currently on landing page).
    if (isAppMode) {
      const splashShown = sessionStorage.getItem('batamart_splash_app')
      if (splashShown) return

      sessionStorage.setItem('batamart_splash_app', '1')
      setVisible(true)

      const fadeTimer = setTimeout(() => setFadeOut(true), 2500)
      const doneTimer = setTimeout(() => {
        setVisible(false)
        if (pathname === '/') {
          router.replace('/marketplace?app=true')
        }
      }, 3000)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(doneTimer)
      }
    }

    // ── BROWSER MODE ──────────────────────────────────────────────────────────
    // Only show the FIRST time user lands on /marketplace this session.
    // Never on landing page or other pages. Never on return visits.
    if (pathname === '/marketplace') {
      const splashShown = sessionStorage.getItem('batamart_splash_browser')
      if (splashShown) return

      sessionStorage.setItem('batamart_splash_browser', '1')
      setVisible(true)

      const fadeTimer = setTimeout(() => setFadeOut(true), 2500)
      const doneTimer = setTimeout(() => setVisible(false), 3000)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(doneTimer)
      }
    }

    // All other pages → no splash
  }, [pathname, searchParams, router])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src="/icon-512x512.png"
        alt="BataMart"
        className={`w-[140px] h-[140px] object-contain transition-all duration-700 ${
          fadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      />
      <p
        className={`mt-3 text-[#1a3f8f] text-sm font-semibold transition-all duration-700 ${
          fadeOut ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
        }`}
        style={{ transitionDelay: '0.3s' }}
      >
        Campus Marketplace
      </p>
    </div>
  )
}