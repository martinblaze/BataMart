'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // 🚫 Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // show after delay (smooth UX)
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShow(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
        
        <img src="/icon-192x192.png" className="w-10 h-10 rounded-xl" />

        <div className="flex-1">
          <p className="font-bold text-sm text-gray-900">
            Install BataMart
          </p>
          <p className="text-xs text-gray-500">
            Faster access & notifications
          </p>
        </div>

        <button
          onClick={install}
          className="bg-BATAMART-primary text-white text-xs font-bold px-3 py-2 rounded-lg"
        >
          Install
        </button>
      </div>
    </div>
  )
}