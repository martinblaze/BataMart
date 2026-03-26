// hooks/usePushSubscription.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useNotificationNudge } from '@/hooks/useNotificationNudge'

export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    ) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) return
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('[Push] Check subscription error:', error)
    }
  }

  const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service worker ready timeout')), 10000)
        ),
      ])
      return registration as ServiceWorkerRegistration
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error)
      return null
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser')
      return false
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
      toast.error('Notifications are not configured yet. Please try again later.')
      return false
    }

    setIsLoading(true)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'denied') {
        toast.error('Notification permission denied. You can enable it in your browser settings.')
        return false
      }

      if (result !== 'granted') return false

      const registration = await getServiceWorkerRegistration()
      if (!registration) {
        toast.error('Failed to set up notifications. Please reload the page and try again.')
        return false
      }

      let subscription: PushSubscription
      try {
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          subscription = existing
        } else {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          })
        }
      } catch (subError: any) {
        console.error('[Push] pushManager.subscribe failed:', subError)
        if (subError.name === 'InvalidStateError') {
          toast.error('Notification setup conflict. Please reload and try again.')
        } else {
          toast.error('Failed to subscribe to notifications.')
        }
        return false
      }

      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in to enable notifications.')
        return false
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      })

      if (!response.ok) {
        console.error('[Push] Server failed to save subscription:', await response.text())
        toast.error('Failed to save notification settings. Please try again.')
        return false
      }

      setIsSubscribed(true)
      toast.success("Notifications enabled! You'll get updates even when your browser is closed.")
      return true

    } catch (error) {
      console.error('[Push] Subscribe error:', error)
      toast.error('Something went wrong. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) return

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const token = localStorage.getItem('token')
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      toast.success('Notifications disabled')
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error)
      toast.error('Failed to disable notifications')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ── Global floating NotificationPrompt (passive nudge) ───────────────────────
// Shown on every page except when snoozed.
// "Not Now" snoozes for 24h, then shows again — never dismisses forever.
export function NotificationPrompt() {
  const { shouldShowPassive, snooze, markGranted } = useNotificationNudge()
  const { isLoading, subscribe } = usePushSubscription()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!shouldShowPassive) return
    // Delay so it doesn't slam in on page load
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [shouldShowPassive])

  const handleEnable = async () => {
    const granted = await subscribe()
    if (granted) {
      markGranted()
      setVisible(false)
    }
  }

  const handleSnooze = () => {
    setVisible(false)
    snooze()
  }

  if (!visible) return null

  return (
    <div
      className="fixed right-4 z-[9990] w-[calc(100vw-2rem)] max-w-[320px]"
      style={{
        bottom: 'calc(72px + max(env(safe-area-inset-bottom), 16px) + 12px)',
        animation: 'notifSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bellRing {
          0%,100% { transform: rotate(0); }
          15%      { transform: rotate(14deg); }
          30%      { transform: rotate(-10deg); }
          45%      { transform: rotate(8deg); }
          60%      { transform: rotate(-6deg); }
          75%      { transform: rotate(4deg); }
        }
        .bell-ring-anim { animation: bellRing 1.6s ease 0.6s both; }
      `}</style>

      <div className="rounded-2xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: '0 8px 32px rgba(26,63,143,0.16), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(59,158,245,0.15)',
        }}
      >
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#1a3f8f,#3b9ef5)' }} />
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bell-ring-anim"
              style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)', boxShadow: '0 4px 12px rgba(26,63,143,0.3)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">Stay in the loop 🔔</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Get notified about your orders, deliveries, and messages instantly.
              </p>
            </div>
            <button
              onClick={handleSnooze}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors -mt-0.5 -mr-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Order updates', 'Delivery alerts', 'New messages'].map((label) => (
              <span key={label} className="text-[10px] font-medium px-2 py-1 rounded-full"
                style={{ background: 'rgba(59,158,245,0.08)', color: '#1a3f8f' }}
              >
                ✓ {label}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-opacity"
              style={{
                background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)',
                boxShadow: '0 4px 12px rgba(26,63,143,0.3)',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Enabling…' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleSnooze}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-gray-500 transition-colors"
              style={{ background: '#f3f4f6' }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}