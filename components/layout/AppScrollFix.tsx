'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function BottomNavSpacerInner() {
  const searchParams = useSearchParams()
  const isAppParam = searchParams.get('app') === 'true'
  const isAndroid = searchParams.get('android') === 'true'

  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isApp = isAppParam || isStandalone || isAndroid

  if (!isApp) return null

  return (
    <div
      style={{
        height: 'calc(64px + max(env(safe-area-inset-bottom), 16px))',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  )
}

export function AppScrollFix({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <BottomNavSpacerInner />
      </Suspense>
    </>
  )
}