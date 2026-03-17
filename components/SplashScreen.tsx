'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
    }, 2500)

    const remove = setTimeout(() => {
      setVisible(false)
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(remove)
    }
  }, [])

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