'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // First unregister ALL existing service workers to clear any stale cache
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
        console.log('SW unregistered:', registration.scope)
      }
    }).then(() => {
      // Then register fresh
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('SW registered fresh'))
        .catch(err => console.log('SW error', err))
    })
  }, [])

  return null
}