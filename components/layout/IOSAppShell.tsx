'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'

function IOSAppShellInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isAppParam = searchParams.get('app') === 'true'
  const isAndroid = searchParams.get('android') === 'true'

  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsIOS(ios)
    setIsStandalone(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isApp = isAppParam || isStandalone
  const isIOSApp = isIOS && isApp && !isAndroid

  useEffect(() => {
    const html = document.documentElement
    if (isApp) {
      html.classList.add('app-mode')
    } else {
      html.classList.remove('app-mode')
    }
    return () => html.classList.remove('app-mode')
  }, [isApp])

  if (isIOSApp) {
    return (
      <div
        id="ios-app-shell"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          // Push content below the fixed top navbar (h-14 = 56px)
          paddingTop: '56px',
          // Account for iOS safe area at bottom
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* This div is the ONLY thing that scrolls */}
        <div
          id="ios-scroll-area"
          key={pathname || 'root'}
          className="app-route-enter"
          style={{
            flex: 1,
            overflowY: 'scroll',
            overflowX: 'hidden',
            // Critical — tells iOS this is the scroll container
            WebkitOverflowScrolling: 'touch',
            // Bottom padding so content clears the bottom nav (64px)
            paddingBottom: '64px',
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  // Non-iOS or browser — render normally, no shell
  return (
    <div
      id="page-scroll-container"
      key={pathname || 'root'}
      className={isApp ? 'app-route-enter' : ''}
      style={{ paddingBottom: 'calc(64px + max(env(safe-area-inset-bottom), 16px))' }}
    >
      {children}
    </div>
  )
}

export function IOSAppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div id="page-scroll-container">{children}</div>}>
      <IOSAppShellInner>{children}</IOSAppShellInner>
    </Suspense>
  )
}
