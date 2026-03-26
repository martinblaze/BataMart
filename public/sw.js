// public/sw.js
// Service Worker for BataMart push notifications

const CACHE_NAME = 'batamart-v1'

// ── Install: activate immediately, don't wait ────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

// ── Activate: take control of all clients immediately ────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated')
  event.waitUntil(self.clients.claim())
})

// ── Push: show notification when server sends a push ─────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  let data = {
    title: 'BataMart',
    message: 'You have a new notification',
    url: '/',
    tag: 'default',
    requireInteraction: false,
  }

  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e)
  }

  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'batamart-notification',
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ── Notification click: open the relevant page ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a BataMart tab is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// ── Notification close: cleanup ──────────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag)
})