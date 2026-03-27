// app/(marketplace)/rider-dashboard/page.tsx
// ── FIX #7 (race condition): acceptOrder uses authFetch which handles 409
//    conflict responses from the server. The server must use a DB transaction
//    to atomically check + assign the order, so only one rider wins.
//
// ── FIX #8 (stock reservation): No change needed here — stock locking
//    is handled server-side in the payment flow.
//
// ── FIX #10 (alert/confirm dialogs): All alert() and confirm() calls
//    replaced with inline toast/banner UI. No more browser popups.
//
// ── FIX #6: Uses authFetch so expired tokens auto-redirect to /login.
//
// ── Rider availability: If the toggle API fails, the UI reverts to the
//    previous state instead of staying optimistically wrong.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle, MapPin, Phone, Package, CheckCircle, X } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'

// ── Simple inline toast — no alert() ─────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  }
  return (
    <div className={`fixed top-4 left-0 right-0 z-50 flex justify-center px-4`}>
      <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg max-w-sm w-full ${colors[type]}`}>
        <p className="text-sm font-semibold flex-1">{message}</p>
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function RiderDashboardPage() {
  const router = useRouter()
  const [rider, setRider] = useState<any>(null)
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [disputePickups, setDisputePickups] = useState<any[]>([])
  const [myDeliveries, setMyDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // ── FIX #10: Toast state instead of alert() ───────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetchRiderData()
  }, [])

  const fetchRiderData = async () => {
    try {
      const [profileRes, ordersRes, deliveriesRes] = await Promise.all([
        authFetch('/api/auth/me'),
        authFetch('/api/riders/available-orders'),
        authFetch('/api/riders/my-deliveries'),
      ])

      const profileData    = await profileRes.json()
      const ordersData     = await ordersRes.json()
      const deliveriesData = await deliveriesRes.json()

      setRider(profileData.user)
      setAvailableOrders(ordersData.orders || [])
      setDisputePickups(ordersData.disputePickups || [])
      setMyDeliveries(deliveriesData.deliveries || [])
      setIsAvailable(profileData.user.isAvailable)
    } catch (error) {
      console.error('Error fetching rider data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── FIX (availability revert): Save previous state so we can roll back ────
  const toggleAvailability = async () => {
    if (actionLoading['toggle-availability']) return
    const previousState = isAvailable
    setActionLoading(prev => ({ ...prev, 'toggle-availability': true }))

    // Optimistic update
    setIsAvailable(!previousState)

    try {
      const res = await authFetch('/api/riders/toggle-availability', { method: 'POST' })
      if (!res.ok) {
        // Revert on failure instead of staying in wrong state
        setIsAvailable(previousState)
        showToast('Failed to update availability. Please try again.', 'error')
      } else {
        showToast(`You are now ${!previousState ? 'available' : 'unavailable'} for orders.`, 'success')
      }
    } catch {
      setIsAvailable(previousState)
      showToast('Network error updating availability.', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, 'toggle-availability': false }))
    }
  }

  // ── FIX #7: Handle 409 conflict (another rider grabbed this order) ────────
  const acceptOrder = async (orderId: string) => {
    if (actionLoading[`accept-${orderId}`]) return
    setActionLoading(prev => ({ ...prev, [`accept-${orderId}`]: true }))
    try {
      const res = await authFetch('/api/riders/accept-order', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Order accepted! Head to pickup location.', 'success')
        await fetchRiderData()
      } else if (res.status === 409) {
        // Race condition — another rider accepted first
        showToast('Sorry, another rider just accepted this order. Refreshing available orders.', 'info')
        await fetchRiderData()
      } else {
        showToast(data.error || 'Failed to accept order. Please try again.', 'error')
      }
    } catch {
      showToast('Network error. Please check your connection.', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [`accept-${orderId}`]: false }))
    }
  }

  const updateStatus = async (orderId: string, status: string) => {
    if (actionLoading[`status-${orderId}`]) return
    setActionLoading(prev => ({ ...prev, [`status-${orderId}`]: true }))
    try {
      const res = await authFetch('/api/riders/update-status', {
        method: 'POST',
        body: JSON.stringify({ orderId, status }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchRiderData()
      } else {
        showToast(data.error || 'Failed to update status.', 'error')
      }
    } catch {
      showToast('Network error updating status.', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [`status-${orderId}`]: false }))
    }
  }

  const markDisputePickedUp = async (orderId: string) => {
    if (actionLoading[`dispute-pickup-${orderId}`]) return
    setActionLoading(prev => ({ ...prev, [`dispute-pickup-${orderId}`]: true }))
    try {
      const res = await authFetch('/api/riders/dispute-picked-up', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Marked as collected. Return the item to complete this job.', 'success')
        await fetchRiderData()
      } else {
        showToast(data.error || 'Failed to update.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [`dispute-pickup-${orderId}`]: false }))
    }
  }

  const hasDisputePickupPending = disputePickups.length > 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-BATAMART-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* ── FIX #10: Toast notification instead of alert() ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {rider?.name}!</p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={actionLoading['toggle-availability']}
              className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAvailable ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {actionLoading['toggle-availability']
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</>
                : isAvailable ? '🟢 Available' : '⚫ Unavailable'
              }
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{rider?.completedOrders || 0}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Active</p>
              <p className="text-2xl font-bold text-blue-900">{myDeliveries.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Earnings</p>
              <p className="text-2xl font-bold text-purple-900">₦{((rider?.completedOrders || 0) * 560).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Dispute Pickup Jobs */}
        {hasDisputePickupPending && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-red-600">Return Pickup Required</h2>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                {disputePickups.length} pending
              </span>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                You must complete this return pickup before accepting new orders.
                You will earn <strong>₦560</strong> once the item is confirmed received.
              </span>
            </div>

            <div className="space-y-4">
              {disputePickups.map((order: any) => {
                const pickup = order.dispute?.pickupAddress as any
                return (
                  <div key={order.id} className="bg-white border-2 border-red-300 rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wide bg-red-50 px-2 py-1 rounded-full">
                          Dispute Return
                        </span>
                        <p className="text-sm text-gray-500 mt-1">#{order.orderNumber}</p>
                        <p className="font-bold text-gray-900 mt-0.5">{order.product.name}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        ₦560 on completion
                      </span>
                    </div>

                    {order.dispute?.reason && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Reason for return</p>
                        <p>{order.dispute.reason}</p>
                      </div>
                    )}

                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Collect from buyer</p>
                      </div>
                      {pickup ? (
                        <div className="text-sm space-y-0.5">
                          <p className="text-gray-800 font-medium">{pickup.hostel}{pickup.room ? `, Room ${pickup.room}` : ''}</p>
                          {pickup.landmark && <p className="text-gray-500">{pickup.landmark}</p>}
                          <p className="text-blue-700 font-medium flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" /> {pickup.phone}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm space-y-0.5">
                          <p className="text-gray-800 font-medium">{order.deliveryHostel}, Room {order.deliveryRoom}</p>
                          {order.deliveryLandmark && <p className="text-gray-500">{order.deliveryLandmark}</p>}
                          <p className="text-blue-700 font-medium flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" /> {order.deliveryPhone}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="w-4 h-4 text-orange-500" />
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Return item to admin / store</p>
                      </div>
                      <p className="text-sm text-gray-600">Contact admin for drop-off location if unsure.</p>
                    </div>

                    <button
                      onClick={() => markDisputePickedUp(order.id)}
                      disabled={actionLoading[`dispute-pickup-${order.id}`]}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading[`dispute-pickup-${order.id}`]
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                        : 'I Have Collected the Item from Buyer'
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Orders */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Available Orders ({availableOrders.length})
          </h2>

          {hasDisputePickupPending && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              New orders are locked until you complete the return pickup above.
            </div>
          )}

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <p className="text-gray-500">No available orders at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {availableOrders.map((order: any) => (
                <div key={order.id} className={`bg-white rounded-xl shadow-md p-6 ${hasDisputePickupPending ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-500">#{order.orderNumber}</p>
                      <p className="font-bold text-gray-900 mt-1">{order.product.name}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">NEW</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600"><strong>Pickup:</strong> {order.product.hostelName}</p>
                    <p className="text-gray-600"><strong>Delivery:</strong> {order.deliveryHostel}</p>
                    <p className="text-green-600 font-bold">Earn: ₦560</p>
                  </div>

                  <button
                    onClick={() => acceptOrder(order.id)}
                    disabled={actionLoading[`accept-${order.id}`] || hasDisputePickupPending}
                    className="w-full mt-4 bg-BATAMART-primary hover:bg-BATAMART-dark text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {actionLoading[`accept-${order.id}`]
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting...</>
                      : 'Accept Order'
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Active Deliveries */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Active Deliveries</h2>
          {myDeliveries.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <p className="text-gray-500">No active deliveries</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myDeliveries.map((delivery: any) => (
                <div key={delivery.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-500">#{delivery.orderNumber}</p>
                      <p className="font-bold text-gray-900 mt-1">{delivery.product.name}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Pickup:</strong></p>
                      <p>{delivery.product.hostelName}</p>
                      <p className="text-sm text-gray-500">{delivery.seller.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Delivery:</strong></p>
                      <p>{delivery.deliveryHostel}, {delivery.deliveryRoom}</p>
                      <p className="text-sm text-gray-500">{delivery.deliveryPhone}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {delivery.status === 'RIDER_ASSIGNED' && (
                      <button
                        onClick={() => updateStatus(delivery.id, 'PICKED_UP')}
                        disabled={actionLoading[`status-${delivery.id}`]}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {actionLoading[`status-${delivery.id}`]
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                          : 'Mark as Picked Up'
                        }
                      </button>
                    )}
                    {delivery.status === 'PICKED_UP' && (
                      <button
                        onClick={() => updateStatus(delivery.id, 'ON_THE_WAY')}
                        disabled={actionLoading[`status-${delivery.id}`]}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {actionLoading[`status-${delivery.id}`]
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                          : 'On The Way'
                        }
                      </button>
                    )}
                    {delivery.status === 'ON_THE_WAY' && (
                      <button
                        onClick={() => updateStatus(delivery.id, 'DELIVERED')}
                        disabled={actionLoading[`status-${delivery.id}`]}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {actionLoading[`status-${delivery.id}`]
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                          : 'Mark as Delivered'
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}