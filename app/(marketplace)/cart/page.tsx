'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import {
  ShoppingCart, Trash2, Plus, Minus, ChevronLeft,
  Package, Lock, Truck, Shield, ArrowRight, X,
  Sparkles, MapPin, BadgeCheck, Zap,
} from 'lucide-react';

const CART_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }

  .cart-item {
    transition: background 0.15s ease, box-shadow 0.2s ease;
  }
  .cart-item:hover { background: #fafafa; }

  .qty-btn {
    transition: background 0.12s ease, transform 0.12s cubic-bezier(0.34,1.4,0.64,1);
  }
  .qty-btn:hover:not(:disabled) { background: white; transform: scale(1.1); }
  .qty-btn:active:not(:disabled) { transform: scale(0.92); }

  .checkout-btn {
    background: linear-gradient(135deg, #6366f1, #4c1d95);
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease;
    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
  }
  .checkout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(99,102,241,0.45);
  }
  .checkout-btn:active { transform: scale(0.98); }

  .trust-card {
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease;
  }
  .trust-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.07); }

  .header-gradient {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  }
`

export default function CartPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [universityShortName, setUniversityShortName] = useState<string>('');
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();

  useEffect(() => {
    if (document.getElementById('cart-anim')) return
    const s = document.createElement('style'); s.id = 'cart-anim'; s.textContent = CART_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.user?.university?.shortName) setUniversityShortName(data.user.university.shortName) })
        .catch(() => {});
    }
  }, []);

  const fmt = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price);

  const handleCheckout = () => {
    if (items.length === 0) return;
    sessionStorage.setItem('checkout_cart', JSON.stringify(items));
    router.push('/checkout');
  };

  if (!isClient) return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-40 shimmer rounded-xl mb-8" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-36 shimmer rounded-2xl" />)}
          </div>
          <div className="h-64 shimmer rounded-2xl" />
        </div>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4">
      <div className="fade-up text-center bg-white rounded-3xl p-12 sm:p-16 shadow-sm border border-gray-100 max-w-md w-full">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4c1d95)' }}>
          <ShoppingCart className="w-11 h-11 text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Browse our marketplace and add items you love!</p>
        <button
          onClick={() => router.push('/marketplace')}
          className="checkout-btn inline-flex items-center gap-2.5 text-white px-8 py-4 rounded-2xl font-black text-base"
        >
          <Sparkles className="w-5 h-5" /> Start Shopping
        </button>
      </div>
    </div>
  );

  const deliveryFee    = 800;
  const subtotal       = getTotalPrice();
  const total          = subtotal + deliveryFee;
  const uniqueSellers  = new Set(items.map(i => i.sellerId)).size;
  const totalUnits     = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-24">

      {/* ── Header ── */}
      <header className="header-gradient sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/marketplace')}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-white">
                My Cart <span className="text-white/50 font-semibold text-sm">({items.length} item{items.length !== 1 ? 's' : ''})</span>
              </h1>
              <p className="text-white/50 text-xs">{uniqueSellers} seller{uniqueSellers !== 1 ? 's' : ''} · {totalUnits} unit{totalUnits !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={clearCart}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors border border-red-400/20">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT: Items ── */}
          <div className="lg:col-span-2 space-y-4">

            <div className="fade-up bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <div key={item.id} className="cart-item p-4 sm:p-5">
                    <div className="flex gap-3 sm:gap-4">
                      <Link href={`/product/${item.productId}`} className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-300 transition-colors shadow-sm">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/product/${item.productId}`}
                              className="font-black text-gray-900 hover:text-indigo-600 transition-colors text-sm sm:text-base line-clamp-2">
                              {item.name}
                            </Link>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3 text-blue-500" />
                              <Link href={`/seller/${item.sellerId}`} className="text-indigo-600 font-bold hover:underline">{item.sellerName}</Link>
                            </p>
                          </div>
                          <button onClick={() => removeItem(item.productId)}
                            className="p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}
                              className="qty-btn w-9 h-9 flex items-center justify-center text-gray-600 disabled:opacity-30">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-black text-sm text-gray-900">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.maxQuantity}
                              className="qty-btn w-9 h-9 flex items-center justify-center text-gray-600 disabled:opacity-30">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-indigo-600 text-base sm:text-lg">{fmt(item.price * item.quantity)}</p>
                            <p className="text-[11px] text-gray-400">{fmt(item.price)} each</p>
                          </div>
                        </div>
                        {item.quantity >= item.maxQuantity && (
                          <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Max quantity reached
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust strip */}
            <div className="fade-up grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Shield className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', title: 'Secure Payments', sub: 'Money held until delivery confirmed' },
                { icon: <Truck className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50', title: 'Campus Delivery', sub: universityShortName ? `Fast delivery within ${universityShortName}` : 'Fast campus delivery' },
                { icon: <BadgeCheck className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', title: 'Verified Sellers', sub: 'All sellers are verified students' },
              ].map(({ icon, bg, title, sub }) => (
                <div key={title} className="trust-card bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Summary ── */}
          <div className="lg:col-span-1">
            <div className="fade-up bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Order Summary</p>

              <div className="space-y-3 pb-4 border-b border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({totalUnits} unit{totalUnits !== 1 ? 's' : ''})</span>
                  <span className="font-bold text-gray-900">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery Fee</span>
                  <span className="font-bold text-gray-900">{fmt(deliveryFee)}</span>
                </div>
              </div>

              <div className="flex justify-between mt-4 mb-5">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-indigo-600 text-xl">{fmt(total)}</span>
              </div>

              <button onClick={handleCheckout}
                className="checkout-btn w-full flex items-center justify-center gap-2.5 text-white py-4 rounded-2xl font-black text-base">
                <Lock className="w-4 h-4" /> Checkout · {fmt(total)}
              </button>

              <p className="text-[11px] text-center text-gray-400 mt-3">Secured through Paystack</p>

              <div className="mt-5 pt-4 border-t border-gray-50 space-y-2.5">
                {[
                  { label: 'Total Items', value: totalUnits },
                  { label: 'Unique Products', value: items.length },
                  { label: `Seller${uniqueSellers !== 1 ? 's' : ''}`, value: uniqueSellers },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">{label}</span>
                    <span className="font-black text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <Link href="/marketplace"
                className="mt-4 flex items-center justify-center gap-1.5 text-indigo-600 text-xs font-bold hover:underline">
                <ChevronLeft className="w-3.5 h-3.5" /> Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}