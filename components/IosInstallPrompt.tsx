'use client'

import { useEffect, useState } from 'react'

export default function IosInstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

    // 🚫 Don't show if already installed
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches

    if (!isIos || isInStandalone) return

    // show after delay
    setTimeout(() => setShow(true), 4000)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        
        <p className="font-bold text-sm text-gray-900 mb-2">
          Install BataMart 📱
        </p>

        <p className="text-xs text-gray-600 leading-relaxed">
          1. Tap the <span className="font-bold">Share</span> button (⬆️)<br />
          2. Tap <span className="font-bold">“Add to Home Screen”</span>
        </p>

        <button
          onClick={() => setShow(false)}
          className="mt-3 text-xs text-gray-500"
        >
          Got it
        </button>
      </div>
    </div>
  )
}