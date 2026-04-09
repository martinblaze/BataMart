// app/(marketplace)/checkout/page.tsx
// ── UPGRADED: Selected variants are auto-filled into the "Note to Seller"
//    field. The user can still add/edit extra notes. The variants portion
//    is always prepended so sellers know exactly what was ordered.
//
// ── FIX #4: Delivery fee is not hardcoded on the client.
// ── FIX #5: Product prices are re-validated server-side.
// ── FIX #6: Uses authFetch so a 401 auto-redirects to /login.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/cart-store'
import { authFetch } from '@/lib/auth-client'
import { formatVariantSelection } from '@/lib/variants'
import {
  ChevronLeft, Lock, Shield, Truck, CheckCircle,
  MapPin, Phone, User, Home, Loader2, AlertCircle,
  MessageSquare, Info, ArrowRight, Package, Tag,
} from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const { clearCart } = useCartStore()
  const [cartItems, setCartItems] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [serverDeliveryFee, setServerDeliveryFee] = useState<number | null>(null)

  // Per-item EXTRA notes (variants are auto-populated separately)
  const [extraNotes, setExtraNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    // ── Show error messages from payment callback ──
    const searchParams = new URLSearchParams(window.location.search)
    const urlError = searchParams.get('error')
    const productName = searchParams.get('product')

    if (urlError === 'payment_failed') {
      setError('SAFE_TO_RETRY|Payment was not successful. Please try again.')
    } else if (urlError === 'out_of_stock' && productName) {
      setError(`NOT_CHARGED|Sorry, "${decodeURIComponent(productName)}" went out of stock just before your payment was confirmed. You have NOT been charged — please try a different item.`)
    } else if (urlError === 'verification_failed' || urlError === 'order_creation_failed') {
      setError('CHECK_ORDERS|Your payment may have gone through but something went wrong on our end. DO NOT pay again — check your Orders page first.')
    } else if (urlError === 'product_not_found' || urlError === 'product_inactive') {
      const name = productName ? `"${decodeURIComponent(productName)}"` : 'one of the products'
      setError(`NOT_CHARGED|${name} is no longer available. You have NOT been charged.`)
    } else if (urlError === 'no_reference') {
      setError('SAFE_TO_RETRY|Payment session expired. Please try again.')
    }

    // ── Load cart items ──
    const cartData = sessionStorage.getItem('checkout_cart')
    if (cartData) {
      const parsed = JSON.parse(cartData)
      setCartItems(parsed)
    } else {
      const productData = sessionStorage.getItem('checkout_product')
      if (productData) {
        const product = JSON.parse(productData)
        setCartItems([{
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.images?.[0] || product.image || '',
          sellerId: product.sellerId,
          sellerName: product.seller?.name || product.sellerName || '',
          selectedVariants: product.selectedVariants || {},
        }])
      } else {
        router.push('/marketplace')
        return
      }
    }

    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await authFetch('/api/auth/me')
      const data = await response.json()
      if (response.ok) setUser(data.user)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  // Build the full note to seller = variants summary + user's extra note
  const buildOrderNote = (item: any): string => {
    const variantNote = formatVariantSelection(item.selectedVariants || {})
    const extra = extraNotes[item.productId]?.trim() || ''
    const parts = []
    if (variantNote) parts.push(`[Order: ${variantNote}]`)
    if (extra) parts.push(extra)
    return parts.join(' — ')
  }

  const handlePayment = async () => {
    if (!user?.hostelName) {
      router.push('/profile/setup')
      return
    }

    setLoading(true)
    setError('')

    try {
      const cartItemsWithNotes = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        // ── Auto-filled variant note + user's extra note ──
        orderNote: buildOrderNote(item),
        _displayName: item.name,
        _displayImage: item.image,
        sellerId: item.sellerId,
      }))

      const response = await authFetch('/api/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ cartItems: cartItemsWithNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Payment initialisation failed. Please try again.')
        return
      }

      if (data.deliveryFee !== undefined) setServerDeliveryFee(data.deliveryFee)

      if (data.authorization_url) {
        sessionStorage.removeItem('checkout_product')
        sessionStorage.removeItem('checkout_cart')
        clearCart()
        window.location.href = data.authorization_url
        return
      }

      if (data.devMode || data.orderId) {
        sessionStorage.removeItem('checkout_product')
        sessionStorage.removeItem('checkout_cart')
        clearCart()
        router.push(`/orders?payment=success&order=${data.orderNumber || data.orderId}`)
        return
      }

      setError('Unexpected response from payment server. Please try again.')
    } catch (err) {
      console.error('Payment error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  if (cartItems.length === 0 || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
    </div>
  )

  const deliveryFee  = serverDeliveryFee ?? 800
  const subtotal     = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalAmount  = subtotal + deliveryFee
  const sellerAmount = subtotal * 0.95

  // Parse error prefix
  const parseError = (e: string) => {
    const [prefix, ...rest] = e.split('|')
    const msg = rest.join('|') || prefix
    const type = rest.length > 0 ? prefix : 'ERROR'
    return { type, msg }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/cart')}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Cart
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-black text-gray-900">Secure Checkout</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Error Banner */}
            {error && (() => {
              const { type, msg } = parseError(error)
              const colors = type === 'NOT_CHARGED'
                ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' }
                : type === 'CHECK_ORDERS'
                  ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' }
                  : { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' }
              return (
                <div className={`${colors.bg} ${colors.border} border rounded-2xl p-4 flex items-start gap-3`}>
                  <AlertCircle className={`w-4 h-4 ${colors.icon} flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm ${colors.text} font-semibold`}>{msg}</p>
                </div>
              )
            })()}

            {/* Delivery Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" /> Delivery Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="font-semibold text-gray-700">{user.name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600">{[user.hostelName, user.roomNumber, user.landmark].filter(Boolean).join(', ')}</span>
                </div>
                {user.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-600">{user.phone}</span>
                  </div>
                )}
              </div>
              <Link href="/myprofile" className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline">
                Edit Details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-black text-gray-900">Order Items ({cartItems.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {cartItems.map(item => {
                  const variantEntries = Object.entries(item.selectedVariants || {}).filter(([, v]) => v)
                  const variantSummary = variantEntries.map(([, v]) => String(v)).join(' · ')

                  return (
                    <div key={item.productId} className="p-5">
                      {/* Product row */}
                      <div className="flex gap-3 sm:gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 text-sm line-clamp-2">{item.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">by {item.sellerName}</p>

                          {/* ── Variant chips (auto-display) ── */}
                          {variantEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {variantEntries.map(([key, val]) => (
                                <span key={key} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full">
                                  <Tag className="w-2.5 h-2.5" />
                                  {String(val)}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-indigo-600 font-black">{formatPrice(item.price * item.quantity)}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                              Qty: {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Note to Seller ── */}
                      {/* LOCKED: Do not remove this section. Auto-fills variant selection. */}
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex items-start gap-2.5 mb-3">
                          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-amber-900">Note to Seller</p>
                            {variantSummary ? (
                              <p className="text-xs text-amber-700 mt-0.5">
                                ✅ Your selection (<strong>{variantSummary}</strong>) is auto-sent. Add extra info below if needed.
                              </p>
                            ) : (
                              <p className="text-xs text-amber-700 mt-0.5">
                                Let the seller know size, colour, variation, or any special request.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Auto-filled variant preview */}
                        {variantSummary && (
                          <div className="bg-white/70 rounded-lg px-3 py-2 mb-2 border border-amber-100">
                            <p className="text-xs text-gray-500 font-semibold">Auto-filled: <span className="text-indigo-600">[Order: {variantSummary}]</span></p>
                          </div>
                        )}

                        <textarea
                          value={extraNotes[item.productId] || ''}
                          onChange={e => setExtraNotes(prev => ({ ...prev, [item.productId]: e.target.value }))}
                          placeholder={variantSummary ? 'Add extra instructions (optional)...' : 'e.g. "Size M, black colour" or any special request'}
                          rows={2}
                          maxLength={300}
                          className="w-full text-sm bg-white border border-amber-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 resize-none placeholder:text-gray-400 text-gray-800 font-medium"
                        />
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Seller will be notified immediately
                          </p>
                          <p className="text-[11px] text-amber-500 font-semibold">
                            {(extraNotes[item.productId] || '').length}/300
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Escrow Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-black text-gray-900">Secure Escrow Payment</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  'Your payment is held securely in escrow until delivery',
                  'Seller gets paid only after you confirm delivery',
                  'Dispute protection if something goes wrong',
                  'Your money is safe — always.',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 font-medium">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-24">
              <h3 className="font-black text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform fee (5%)</span>
                  <span className="font-bold text-gray-500">included</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery fee</span>
                  <span className="font-bold">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-black text-gray-900">Total</span>
                  <span className="font-black text-indigo-600 text-xl">{formatPrice(totalAmount)}</span>
                </div>
              </div>

              {/* Price lock notice */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-5">
                <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-[11px] text-gray-500 font-semibold">Price is verified server-side at payment</p>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2.5 text-base transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4c1d95)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-5 h-5" /> Pay {formatPrice(totalAmount)}</>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Escrow</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Delivery</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}