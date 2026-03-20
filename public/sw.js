const CACHE_NAME = 'batamart-static-v1'

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png'
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// ⚠️ SAFE caching (DO NOT cache API)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 🚫 NEVER cache API (VERY IMPORTANT)
  if (url.pathname.startsWith('/api')) return

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
    })
  )
})


// PUSH (your original code)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/'
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      return clients.openWindow(urlToOpen)
    })
  )
})