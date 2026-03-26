'use client'

// components/PWARegister.tsx
// Registers the service worker and sets up token message handler
// so the SW can re-subscribe when push subscription auto-refreshes.

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Register SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service worker registered:', registration.scope)
      })
      .catch((err) => {
        console.error('[PWA] Service worker registration failed:', err)
      })

    // Listen for token requests from the service worker
    // (used during pushsubscriptionchange to re-save the subscription)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'GET_TOKEN') {
        const token = localStorage.getItem('token')
        event.ports[0]?.postMessage(token)
      }
    })
  }, [])

  return null
}