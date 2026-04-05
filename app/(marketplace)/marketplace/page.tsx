'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Star, Shield, ShoppingBag, Sparkles, Flame,
  AlertCircle, Clock, TrendingUp, X, ChevronRight,
  Package, Zap, Award, ArrowRight, Tag, Eye, Heart,
  RefreshCw, CheckCircle, Users, Truck, ChevronLeft,
  BadgeCheck, Timer, Percent,
} from 'lucide-react'
import { isSplashPending } from '@/components/SplashScreen'

const PULL_THRESHOLD = 130
const PULL_MAX = 175
const PULL_DEAD_ZONE = 12
const PULL_RESIST = 0.38

const ANIM_CSS = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .card-enter {
    opacity: 0;
    animation: fadeSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes sectionIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .section-enter {
    opacity: 0;
    animation: sectionIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes pulse-badge {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.04); }
  }
  .badge-pulse { animation: pulse-badge 2s ease-in-out infinite; }

  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-inner { animation: ticker 28s linear infinite; }
  .ticker-wrap:hover .ticker-inner { animation-play-state: paused; }

  @keyframes bannerSlide {
    0%   { opacity: 0; transform: translateX(40px); }
    8%   { opacity: 1; transform: translateX(0); }
    92%  { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(-40px); }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
    50% { box-shadow: 0 0 0 6px rgba(99,102,241,0.15); }
  }
  .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }

  .product-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  }
  .product-card:hover {
    transform: translateY(-5px) scale(1.018);
    box-shadow: 0 24px 56px rgba(0,0,0,0.12), 0 4px 16px rgba(99,102,241,0.08);
  }
  .product-card:active {
    transform: scale(0.97);
    transition: transform 0.12s ease;
  }
  .product-img { transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
  .product-card:hover .product-img { transform: scale(1.08); }

  .quick-actions {
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .product-card:hover .quick-actions {
    opacity: 1;
    transform: translateY(0);
  }

  .btn-press { transition: transform 0.15s cubic-bezier(0.34, 1.4, 0.64, 1); }
  .btn-press:hover  { transform: scale(1.03); }
  .btn-press:active { transform: scale(0.96); }

  .cat-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease; }
  .cat-btn:hover:not(.cat-active) { transform: scale(1.06); }
  .cat-btn:active { transform: scale(0.95); }

  .search-input { transition: box-shadow 0.25s ease, background 0.25s ease; }
  .search-input:focus-within {
    box-shadow: 0 0 0 3px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.06) !important;
    background: white !important;
  }

  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .drop-in { animation: dropIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  .rv-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  }
  .rv-card:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }
  .rv-card:active { transform: scale(0.97); }
  .rv-card:hover .product-img { transform: scale(1.06); }

  .interest-pill {
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .interest-pill:hover {
    transform: scale(1.05) translateY(-1px);
    background: #6366f1 !important;
    color: white !important;
    border-color: transparent !important;
    box-shadow: 0 8px 20px rgba(99,102,241,0.25);
  }
  .interest-pill:active { transform: scale(0.96); }

  .hot-tag { transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), background 0.15s ease, color 0.15s ease; }
  .hot-tag:hover { transform: scale(1.07) translateY(-1px); }
  .hot-tag:active { transform: scale(0.95); }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  @keyframes ptr-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .ptr-spinning { animation: ptr-spin 0.7s linear infinite; }

  @keyframes ptr-bounce-in {
    0%   { opacity: 0; transform: translateY(-16px) scale(0.85); }
    60%  { transform: translateY(4px) scale(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ptr-bounce { animation: ptr-bounce-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .ptr-indicator { transition: opacity 0.2s ease; }

  @keyframes viewerCount {
    0%, 100% { color: #ef4444; }
    50% { color: #f97316; }
  }
  .viewer-anim { animation: viewerCount 2.5s ease-in-out infinite; }

  .section-stripe {
    background: linear-gradient(135deg, #6366f1 0%, #4c1d95 100%);
  }
  .section-stripe-orange {
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
  }
  .section-stripe-emerald {
    background: linear-gradient(135deg, #059669 0%, #0891b2 100%);
  }

  @keyframes countUp {
    from { transform: translateY(4px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  .count-appear { animation: countUp 0.3s ease forwards; }

  .discount-badge {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 2px 8px rgba(239,68,68,0.4);
  }

  @keyframes floatBadge {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-2px) rotate(-2deg); }
  }
  .float-badge { animation: floatBadge 3s ease-in-out infinite; }

  .promo-bar {
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
    background-size: 200% 100%;
    animation: shimmerBg 4s linear infinite;
  }
  @keyframes shimmerBg {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  .trust-bar {
    background: linear-gradient(90deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%);
  }

  .scroll-section {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .scroll-section > * {
    scroll-snap-align: start;
  }
`

const CATEGORIES = [
  { name: 'All', icon: '🛍️' },
  { name: 'Fashion & Clothing', icon: '👔' },
  { name: 'Food Services', icon: '🍔' },
  { name: 'Room Essentials', icon: '🏠' },
  { name: 'School Supplies', icon: '🎒' },
  { name: 'Tech Gadgets', icon: '🎧' },
  { name: 'Cosmetics', icon: '💄' },
  { name: 'Snacks', icon: '🍿' },
  { name: 'Books', icon: '📚' },
]

const TRENDING_SEARCHES = ['iPhone', 'Sneakers', 'Laptop', 'Jollof Rice', 'Textbooks', 'Earbuds', 'Braids', 'Power Bank']
const RECENT_SEARCHES_KEY = 'BATAMART-recent-searches'
const RECENTLY_VIEWED_KEY = 'BATAMART-recently-viewed'

// Mock activity signals - UI only, cycled per product
const ACTIVITY_SIGNALS = [
  { icon: '🔥', text: (n: number) => `${n} viewing now` },
  { icon: '🛒', text: (n: number) => `${n} sold today` },
  { icon: '⚡', text: () => 'Selling fast' },
  { icon: '👀', text: () => 'Recently added' },
]

const PROMO_BANNERS = [
  { emoji: '🔥', text: 'Hot Deals — Up to 40% OFF campus picks', accent: 'from-orange-500 to-red-500' },
  { emoji: '⚡', text: 'Flash Sale — Limited stock, grab yours now!', accent: 'from-violet-500 to-purple-600' },
  { emoji: '🚀', text: 'Free Campus Delivery on orders over ₦30,000', accent: 'from-emerald-500 to-teal-500' },
  { emoji: '🎓', text: 'Student Exclusive — Verified sellers only', accent: 'from-blue-500 to-indigo-600' },
]

function getSignal(productId: string, index: number) {
  const hash = productId.charCodeAt(0) + productId.charCodeAt(productId.length - 1)
  const signalIndex = (hash + index) % ACTIVITY_SIGNALS.length
  const signal = ACTIVITY_SIGNALS[signalIndex]
  const count = 5 + ((hash * 7 + index * 3) % 28)
  return { icon: signal.icon, text: signal.text(count) }
}

function getDiscount(productId: string) {
  const hash = productId.charCodeAt(0) * 3 + productId.charCodeAt(productId.length - 1)
  const discounts = [10, 15, 20, 25, 30, 0, 0, 0] // 0 = no discount shown
  return discounts[hash % discounts.length]
}

function getStockLevel(productId: string) {
  const hash = productId.charCodeAt(0) + productId.charCodeAt(1)
  const levels = [null, null, null, 3, 5, 7, null, null] // null = don't show
  return levels[hash % levels.length]
}

function getDeliveryTag(productId: string) {
  const hash = productId.charCodeAt(0)
  const tags = ['Campus Pickup', 'Fast Delivery', 'Free Delivery', null, null]
  return tags[hash % tags.length]
}

function parseTags(description: string): string[] {
  if (!description) return []
  if (description.includes(' | ')) return description.split(' | ').map(t => t.trim()).filter(Boolean)
  return []
}

function TrustPill({ level }: { level: string }) {
  const tone = level === 'GOLD'
    ? { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-400' }
    : level === 'SILVER'
      ? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' }
      : { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} /> {level}
    </span>
  )
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold ring-1 ring-blue-100">
      <BadgeCheck className="w-2.5 h-2.5" /> Verified
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs font-semibold text-gray-500 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Upgraded Product Card
// ─────────────────────────────────────────────
function ProductCard({ product, onClick, delay = 0, showSignal = true }: {
  product: any; onClick: () => void; delay?: number; showSignal?: boolean
}) {
  const tags = parseTags(product.description)
  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)
  const discount = getDiscount(product.id)
  const stockLeft = getStockLevel(product.id)
  const deliveryTag = getDeliveryTag(product.id)
  const signal = showSignal ? getSignal(product.id, delay) : null
  const originalPrice = discount ? Math.round(product.price * (1 + discount / 100)) : null

  return (
    <div onClick={onClick} className="product-card card-enter bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col group"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img src={product.images[0] || '/placeholder.png'} alt={product.name} className="product-img w-full h-full object-cover" />

        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isTrending && (
            <span className="badge-pulse inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black rounded-lg shadow-md">
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {product.isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] font-black rounded-lg shadow-md">
              <Sparkles className="w-2.5 h-2.5" /> NEW
            </span>
          )}
          {product.isPersonalised && !product.isTrending && !product.isNew && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-black rounded-lg shadow-md">
              <Heart className="w-2.5 h-2.5 fill-white" /> FOR YOU
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="float-badge absolute top-2 right-2 discount-badge text-white text-[11px] font-black px-2 py-1 rounded-lg">
            -{discount}%
          </div>
        )}

        {/* Photo count */}
        {product.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}

        {/* Quick Actions on hover */}
        <div className="quick-actions absolute bottom-2 left-2 flex gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); }}
            className="w-7 h-7 bg-white/95 hover:bg-red-50 rounded-lg flex items-center justify-center shadow-sm transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="w-7 h-7 bg-white/95 hover:bg-BATAMART-primary/10 rounded-lg flex items-center justify-center shadow-sm transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500 hover:text-BATAMART-primary" />
          </button>
        </div>
      </div>

      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{product.category}</p>
        <h3 className="font-bold text-gray-900 line-clamp-2 text-xs sm:text-sm leading-snug flex-1">{product.name}</h3>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-semibold rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-BATAMART-primary font-black text-sm sm:text-base tracking-tight">{fmt(product.price)}</span>
            {originalPrice && (
              <span className="text-gray-400 font-medium text-[11px] line-through">{fmt(originalPrice)}</span>
            )}
          </div>
          <StarRating rating={product.seller?.avgRating || 0} />
        </div>

        {/* Delivery tag */}
        {deliveryTag && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Truck className="w-2.5 h-2.5" /> {deliveryTag}
            </span>
          </div>
        )}

        {/* Stock urgency */}
        {stockLeft && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500">
              <Timer className="w-2.5 h-2.5" /> Only {stockLeft} left
            </span>
          </div>
        )}

        {/* Activity signal */}
        {signal && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[10px] viewer-anim font-semibold text-gray-500">{signal.icon} {signal.text}</span>
          </div>
        )}

        {/* Seller info */}
        <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-gray-50">
          <div className="min-w-0 flex items-center gap-1 flex-wrap">
            <Link href={`/seller/${product.seller?.id}`} className="text-[10px] font-semibold text-gray-500 hover:text-BATAMART-primary truncate transition-colors" onClick={e => e.stopPropagation()}>
              {product.seller?.name}
            </Link>
            <VerifiedBadge />
          </div>
          <TrustPill level={product.seller?.trustLevel || 'BRONZE'} />
        </div>
      </div>
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-enter bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
      <div className="aspect-square shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 shimmer rounded-full w-1/2" />
        <div className="h-3.5 shimmer rounded-full w-full" />
        <div className="h-3.5 shimmer rounded-full w-3/4" />
        <div className="h-5 shimmer rounded-full w-1/3 mt-3" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Promo Ticker Bar
// ─────────────────────────────────────────────
function PromoTicker() {
  const items = [
    '🔥 Hot Deals — Up to 40% OFF',
    '⚡ Flash Sale — Limited stock',
    '🚀 Free Delivery on orders over ₦30,000',
    '🎓 Verified Campus Sellers Only',
    '💳 Secure Payments — Wallet Protected',
    '📦 Campus Pickup Available',
    '⭐ Top Rated Products on Campus',
    '🛡️ Buyer Protection Guaranteed',
  ]
  const doubled = [...items, ...items]
  return (
    <div className="promo-bar overflow-hidden py-1.5 ticker-wrap">
      <div className="ticker-inner flex whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="text-white text-[11px] font-bold mx-6 flex-shrink-0">{item}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Trust Bar
// ─────────────────────────────────────────────
function TrustBar() {
  const signals = [
    { icon: <Shield className="w-4 h-4 text-BATAMART-primary" />, label: 'Buyer Protection', sub: 'Every purchase covered' },
    { icon: <BadgeCheck className="w-4 h-4 text-blue-500" />, label: 'Verified Sellers', sub: 'Identity-checked sellers' },
    { icon: <Truck className="w-4 h-4 text-emerald-500" />, label: 'Campus Delivery', sub: 'Fast & reliable' },
    { icon: <Award className="w-4 h-4 text-amber-500" />, label: 'Top Rated', sub: '4.5★ avg across campus' },
    { icon: <Users className="w-4 h-4 text-violet-500" />, label: 'Trusted Community', sub: '5,000+ active students' },
  ]
  return (
    <div className="trust-bar border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2.5">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] font-black text-gray-800 whitespace-nowrap">{s.label}</p>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">{s.sub}</p>
              </div>
              {i < signals.length - 1 && <div className="w-px h-6 bg-gray-200 ml-3 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Section Header (upgraded)
// ─────────────────────────────────────────────
function SectionHeader({
  title, icon, sub, badge, badgeColor = 'bg-orange-500', onSeeAll, delay = 0
}: {
  title: string; icon: React.ReactNode; sub?: string; badge?: string;
  badgeColor?: string; onSeeAll?: () => void; delay?: number
}) {
  return (
    <div className="section-enter flex items-center justify-between mb-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-gray-900">{title}</h2>
            {badge && (
              <span className={`${badgeColor} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide`}>
                {badge}
              </span>
            )}
          </div>
          {sub && <p className="text-[11px] text-gray-400 font-medium">{sub}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="btn-press flex items-center gap-1 text-xs font-bold text-BATAMART-primary hover:text-BATAMART-dark transition-colors bg-BATAMART-primary/5 hover:bg-BATAMART-primary/10 px-3 py-1.5 rounded-lg">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Horizontal Scroll Product Row
// ─────────────────────────────────────────────
function HScrollRow({ products, onProductClick }: { products: any[]; onProductClick: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: number) => rowRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  return (
    <div className="relative group/row">
      <button
        onClick={() => scrollBy(-1)}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-BATAMART-primary hover:text-white hover:border-BATAMART-primary"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div ref={rowRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-1 scroll-section">
        {products.map((p, i) => (
          <div key={p.id} className="flex-shrink-0 w-40 sm:w-44">
            <ProductCard product={p} onClick={() => onProductClick(p.id)} delay={i * 40} />
          </div>
        ))}
      </div>
      <button
        onClick={() => scrollBy(1)}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-BATAMART-primary hover:text-white hover:border-BATAMART-primary"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// Section Wrapper
// ─────────────────────────────────────────────
function MarketSection({
  children, className = ''
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// Pull-to-Refresh
// ─────────────────────────────────────────────
function PullIndicator({ pullDistance, isRefreshing }: { pullDistance: number; isRefreshing: boolean }) {
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const ready = pullDistance >= PULL_THRESHOLD
  return (
    <div
      className="ptr-indicator pointer-events-none fixed top-0 left-0 right-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${Math.min(pullDistance, PULL_MAX) - 64}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        opacity: isRefreshing ? 1 : progress,
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-lg border border-gray-100"
        style={{ transform: `scale(${0.85 + progress * 0.15})` }}>
        <RefreshCw className={`w-4 h-4 text-BATAMART-primary ${isRefreshing ? 'ptr-spinning' : ''}`}
          style={{ transform: isRefreshing ? undefined : `rotate(${progress * 220}deg)` }} />
        <span className="text-xs font-bold text-gray-600">
          {isRefreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Live Stats Bar
// ─────────────────────────────────────────────
function LiveStatsBar({ count }: { count: number }) {
  if (!count) return null
  return (
    <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 font-medium">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
        <span className="font-bold text-gray-700">{count}</span> products live
      </span>
      <span className="w-px h-3 bg-gray-200" />
      <span className="flex items-center gap-1">
        <span className="viewer-anim font-bold">🔴 LIVE</span>
        <span>marketplace</span>
      </span>
      <span className="w-px h-3 bg-gray-200" />
      <span className="flex items-center gap-1">
        <Users className="w-3 h-3 text-violet-400" />
        <span>Students buying now</span>
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function MarketplacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const isApp = searchParams.get('app') === 'true' ||
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)

  const [splashDone, setSplashDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return !isSplashPending()
  })

  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed')
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [interestCategories, setInterestCategories] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [universityShortName, setUniversityShortName] = useState<string>('')
  const [promoBanner, setPromoBanner] = useState(0)

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const isClickingSuggestionRef = useRef(false)

  // Rotate promo banner
  useEffect(() => {
    const t = setInterval(() => setPromoBanner(p => (p + 1) % PROMO_BANNERS.length), 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (splashDone) return
    const handler = () => setSplashDone(true)
    window.addEventListener('batamart:splash-done', handler)
    const fallback = setTimeout(() => setSplashDone(true), 4000)
    return () => { window.removeEventListener('batamart:splash-done', handler); clearTimeout(fallback) }
  }, [splashDone])

  useEffect(() => {
    if (document.getElementById('BATAMART-anim')) return
    const s = document.createElement('style')
    s.id = 'BATAMART-anim'
    s.textContent = ANIM_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    setMounted(true)
    try { setRecentlyViewed(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')) } catch { }
    try { setRecentSearches(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')) } catch { }
    fetchFeed()
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.user?.university?.shortName) setUniversityShortName(data.user.university.shortName)
        })
        .catch(() => { })
    }
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (isClickingSuggestionRef.current) return
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (selectedCategory === 'All') { fetchFeed() } else { fetchByCategory(selectedCategory) }
  }, [selectedCategory])

  useEffect(() => {
    let startY = 0; let latestDelta = 0; let inPullMode = false
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      if (isRefreshing) return
      startY = e.touches[0].clientY; latestDelta = 0; inPullMode = false
    }
    const onTouchMove = (e: TouchEvent) => {
      if (startY === 0) return
      if (isRefreshing) return
      if (window.scrollY > 0) { startY = 0; inPullMode = false; setPullDistance(0); return }
      const delta = e.touches[0].clientY - startY
      if (!inPullMode) {
        if (delta < PULL_DEAD_ZONE) return
        if (delta < 0) { startY = 0; return }
        inPullMode = true
      }
      latestDelta = delta
      const visual = Math.min(delta * PULL_RESIST, PULL_MAX)
      setPullDistance(visual)
      e.preventDefault()
    }
    const onTouchEnd = async () => {
      if (!inPullMode) return
      const triggered = latestDelta * PULL_RESIST >= PULL_THRESHOLD
      inPullMode = false; startY = 0; latestDelta = 0
      if (triggered) {
        setIsRefreshing(true); setPullDistance(PULL_THRESHOLD)
        await fetchFeed()
        setIsRefreshing(false); setPullDistance(0)
      } else { setPullDistance(0) }
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing])

  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + 8, left: r.left, width: r.width })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateDropdownPos)
    window.addEventListener('scroll', updateDropdownPos)
    return () => { window.removeEventListener('resize', updateDropdownPos); window.removeEventListener('scroll', updateDropdownPos) }
  }, [updateDropdownPos])

  const buildFeedSignals = () => {
    let viewed = ''; let searched = ''
    try {
      const rv: any[] = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
      viewed = Array.from(new Set(rv.map((p: any) => p.category).filter(Boolean))).join(',')
    } catch { }
    try {
      searched = (JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') as string[]).join(',')
    } catch { }
    return { viewed, searched }
  }

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const { viewed, searched } = buildFeedSignals()
      const params = new URLSearchParams()
      if (viewed) params.set('viewed', viewed)
      if (searched) params.set('searched', searched)
      const res = await fetch(`/api/products/feed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setAllProducts(data.products || [])
        const cats = Array.from(new Set(
          (data.products || [])
            .filter((p: any) => p.isPersonalised)
            .map((p: any) => p.category)
        )) as string[]
        setInterestCategories(cats.slice(0, 4))
      }
    } catch { }
    finally { setLoading(false) }
  }

  const fetchByCategory = async (category: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setAllProducts(data.products || [])
    } catch { }
    finally { setLoading(false) }
  }

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')
      const product = allProducts.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v: any) => v.id !== id)].slice(0, 20)
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
        setRecentlyViewed(updated)
      }
    } catch { }
    if (token) {
      fetch(`/api/products/${id}/view`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { })
    }
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const handleSearch = (searchTerm?: string) => {
    const q = (searchTerm || searchInput).trim()
    if (!q) return
    try {
      const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 8)
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch { }
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch() }
  }

  const forYouProducts = useMemo(() => allProducts.filter(p => p.isPersonalised).slice(0, 8), [allProducts])
  const trendingProducts = useMemo(() => allProducts.filter(p => p.isTrending).slice(0, 8), [allProducts])
  const newListings = useMemo(() => allProducts.filter(p => p.isNew).slice(0, 8), [allProducts])
  const discoverProducts = useMemo(() => {
    const shown = new Set([...forYouProducts.map(p => p.id), ...trendingProducts.map(p => p.id), ...newListings.map(p => p.id)])
    return allProducts.filter(p => !shown.has(p.id)).slice(0, 12)
  }, [allProducts, forYouProducts, trendingProducts, newListings])

  const filteredByCategory = useMemo(() =>
    selectedCategory === 'All' ? allProducts : allProducts.filter(p => p.category === selectedCategory),
    [allProducts, selectedCategory]
  )

  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return recentSearches.slice(0, 6).map(s => ({ type: 'recent', label: s }))
    const productMatches = allProducts
      .filter(p => { const tags = parseTags(p.description); return p.name.toLowerCase().includes(q) || tags.some((t: string) => t.toLowerCase().includes(q)) })
      .slice(0, 5).map(p => ({ type: 'product', label: p.name, sublabel: fmt(p.price), id: p.id, image: p.images[0] }))
    const trendingMatches = TRENDING_SEARCHES.filter(s => s.toLowerCase().includes(q)).slice(0, 3).map(s => ({ type: 'trending', label: s }))
    return [...productMatches, ...trendingMatches]
  }, [searchInput, allProducts, recentSearches])

  const SuggestionsDropdown = mounted && showSuggestions && suggestions.length > 0
    ? createPortal(
      <div
        className="drop-in fixed z-[9998] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: '320px', overflowY: 'auto' }}
      >
        <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {!searchInput.trim() ? 'Recent Searches' : 'Suggestions'}
          </span>
          {!searchInput.trim() && recentSearches.length > 0 && (
            <span className="text-[10px] text-BATAMART-primary font-bold">RECENT</span>
          )}
        </div>
        {suggestions.map((s: any, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); isClickingSuggestionRef.current = true }}
            onClick={() => {
              isClickingSuggestionRef.current = false
              if (s.type === 'product') { handleProductClick(s.id); return }
              handleSearch(s.label)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {s.type === 'product' && s.image
              ? <img src={s.image} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
              : s.type === 'recent'
                ? <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                : <TrendingUp className="w-4 h-4 text-BATAMART-primary flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{s.label}</p>
              {s.sublabel && <p className="text-xs text-BATAMART-primary font-bold">{s.sublabel}</p>}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          </button>
        ))}
        {searchInput.trim() && (
          <button
            onMouseDown={(e) => { e.preventDefault(); isClickingSuggestionRef.current = true }}
            onClick={() => { isClickingSuggestionRef.current = false; handleSearch() }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-BATAMART-primary/5 hover:bg-BATAMART-primary/10 transition-colors border-t border-gray-50"
          >
            <div className="w-8 h-8 rounded-lg bg-BATAMART-primary/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-BATAMART-primary" />
            </div>
            <span className="text-sm font-bold text-BATAMART-primary">Search for &quot;{searchInput}&quot;</span>
            <ArrowRight className="w-3.5 h-3.5 text-BATAMART-primary flex-shrink-0 ml-auto" />
          </button>
        )}
      </div>,
      document.body
    ) : null

  if (!splashDone) return <div className="min-h-screen bg-white" />

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {SuggestionsDropdown}

      {/* Pull-to-Refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <PullIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      )}

      {/* ── PROMO TICKER ── */}
      <PromoTicker />

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #4c1d95 0%, #6366f1 50%, #4c1d95 100%)',
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.3, 28)}px)` : undefined,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-white/[0.06] blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-white/[0.04] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-indigo-300/[0.08] blur-2xl" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
            <defs><pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 md:pt-10 pb-0">
          {/* Promo banner strip */}
          <div className="mb-4 overflow-hidden">
            {PROMO_BANNERS.map((b, i) => (
              <div key={i} className={`transition-all duration-500 ${i === promoBanner ? 'block' : 'hidden'}`}>
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${b.accent} px-3 py-1.5 rounded-full`}>
                  <span className="text-sm">{b.emoji}</span>
                  <span className="text-white text-[11px] sm:text-xs font-bold">{b.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5 sm:mb-6">
            <div className="space-y-2 w-full sm:w-auto section-enter">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white/90 text-[10px] sm:text-xs font-bold ring-1 ring-white/20 backdrop-blur-sm">
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" /> Campus Marketplace
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-bold ring-1 ring-emerald-400/30">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> LIVE
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                Your Campus
                <span className="text-white/70 block sm:inline">
                  <br className="hidden sm:block" />
                  {universityShortName ? ` at ${universityShortName}` : ' Marketplace'}
                </span>
              </h1>

              <p className="text-white/65 text-xs sm:text-sm max-w-sm">
                Discover products picked for you — from your campus, by your campus.
              </p>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { icon: <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Verified Sellers' },
                  { icon: <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Rated Products' },
                  { icon: <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Campus Delivery' },
                  { icon: <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />, label: 'Buyer Protection' },
                ].map(({ icon, label }, i) => (
                  <span key={label} className="section-enter inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 text-white/85 text-[10px] sm:text-xs font-semibold ring-1 ring-white/15 backdrop-blur-sm"
                    style={{ animationDelay: `${120 + i * 60}ms` }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="hidden sm:flex flex-col gap-2 mt-1 section-enter flex-shrink-0" style={{ animationDelay: '80ms' }}>
              <Link href="/sell" className="btn-press glow-pulse flex items-center gap-2 bg-white text-BATAMART-primary px-5 py-2.5 rounded-xl font-black text-sm shadow-xl">
                <Sparkles className="w-4 h-4" /> Sell a Product
              </Link>
              <Link href="/report" className="btn-press flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold text-sm ring-1 ring-white/15 transition-colors">
                <AlertCircle className="w-4 h-4" /> Report Issue
              </Link>
            </div>
          </div>

          {/* Search card */}
          <div ref={searchRef} className="relative section-enter" style={{ animationDelay: '60ms' }}>
            <div className="bg-white rounded-t-2xl sm:rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] p-3 sm:p-4">
              {/* Search input */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="search-input flex-1 flex items-center gap-2 bg-gray-50 ring-1 ring-gray-200 rounded-xl px-3 sm:px-4">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchInput}
                    onChange={e => { setSearchInput(e.target.value); updateDropdownPos(); setShowSuggestions(true) }}
                    onFocus={() => { updateDropdownPos(); setShowSuggestions(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search products on campus..."
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 py-3"
                    autoComplete="off"
                  />
                  {searchInput && (
                    <button onClick={() => { setSearchInput(''); setShowSuggestions(false) }} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSearch()} className="btn-press flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-BATAMART-primary hover:bg-BATAMART-dark text-white rounded-xl font-black text-sm shadow-md transition-colors">
                    Search
                  </button>
                  {!isApp && (
                    <Link href="/sell" className="btn-press sm:hidden flex items-center justify-center w-12 h-12 my-auto bg-BATAMART-primary/10 border border-BATAMART-primary/20 rounded-xl">
                      <Sparkles className="w-4 h-4 text-BATAMART-primary" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Trending chips */}
              <div className="flex items-center gap-2 mt-3 overflow-hidden">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" /> HOT:
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {TRENDING_SEARCHES.map(tag => (
                    <button key={tag} onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                      className="hot-tag flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-BATAMART-primary hover:text-white text-gray-600 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition-colors">
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <TrustBar />

      {/* ── CATEGORY NAV ── */}
      <div className="sticky top-0 z-30 bg-white/98 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 scroll-section">
              {CATEGORIES.map(cat => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`cat-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap text-[11px] sm:text-xs flex-shrink-0 ${selectedCategory === cat.name
                    ? 'cat-active bg-BATAMART-primary text-white shadow-md shadow-BATAMART-primary/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}>
                  <span className="text-sm">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
              {(['feed', 'grid'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all duration-200"
                  style={viewMode === mode ? { background: 'white', color: '#6366f1', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#6b7280' }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-28 space-y-4">

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} delay={i * 60} />)}
          </div>

        ) : selectedCategory !== 'All' ? (
          /* ── CATEGORY FILTER VIEW ── */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setSelectedCategory('All')} className="text-xs font-bold text-gray-400 hover:text-BATAMART-primary transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> All
              </button>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-bold text-gray-700">{selectedCategory}</span>
              <span className="ml-auto text-[11px] text-gray-400 font-medium">{filteredByCategory.length} items</span>
            </div>
            {filteredByCategory.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold mb-4">Nothing here yet</p>
                <Link href="/sell" className="btn-press inline-flex items-center gap-2 px-5 py-2.5 bg-BATAMART-primary text-white rounded-xl font-bold text-sm shadow-md">
                  <Sparkles className="w-4 h-4" /> List a Product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredByCategory.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 40} />)}
              </div>
            )}
          </div>

        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div>
            <div className="flex items-center justify-between mb-3">
              <LiveStatsBar count={allProducts.length} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 30} />)}
            </div>
          </div>

        ) : (
          /* ── PERSONALISED FEED VIEW ── */
          <div className="space-y-4">

            {/* Live stats */}
            {allProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <LiveStatsBar count={allProducts.length} />
              </div>
            )}

            {/* Interest Categories */}
            {interestCategories.length > 0 && (
              <MarketSection>
                <SectionHeader title="Your Interests" icon={<Eye className="w-4 h-4 text-violet-500" />} sub="Based on your browsing" />
                <div className="flex flex-wrap gap-2">
                  {interestCategories.map((cat, i) => {
                    const catObj = CATEGORIES.find(c => c.name === cat)
                    return (
                      <button key={cat} onClick={() => setSelectedCategory(cat)}
                        className="interest-pill card-enter flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm"
                        style={{ animationDelay: `${i * 50}ms` }}>
                        <span>{catObj?.icon}</span> {cat}
                      </button>
                    )
                  })}
                </div>
              </MarketSection>
            )}

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
              <MarketSection>
                <SectionHeader title="Recently Viewed" icon={<Clock className="w-4 h-4 text-gray-400" />} sub="Pick up where you left off" />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {recentlyViewed.slice(0, 8).map((p, i) => (
                    <div key={p.id} onClick={() => handleProductClick(p.id)}
                      className="rv-card card-enter flex-shrink-0 w-36 sm:w-40 cursor-pointer bg-gray-50 rounded-xl overflow-hidden border border-gray-100"
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        <img src={p.images?.[0] || '/placeholder.png'} alt={p.name} className="product-img w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                        <p className="text-xs font-black text-BATAMART-primary mt-1">{fmt(p.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </MarketSection>
            )}

            {/* 🔥 Flash Deals / Trending */}
            {trendingProducts.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-sm">
                <div className="section-stripe-orange px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-white" />
                      <div>
                        <h2 className="text-base font-black text-white">Flash Deals</h2>
                        <p className="text-orange-100 text-[11px]">Trending on campus right now</p>
                      </div>
                      <span className="badge-pulse ml-1 bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">HOT</span>
                    </div>
                    <button onClick={() => setSelectedCategory('All')} className="text-white/80 text-xs font-bold flex items-center gap-1">
                      See all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-4 py-4">
                  <HScrollRow products={trendingProducts} onProductClick={handleProductClick} />
                </div>
              </div>
            )}

            {/* ⭐ For You */}
            {forYouProducts.length > 0 && (
              <MarketSection>
                <SectionHeader
                  title="For You"
                  icon={<Heart className="w-4 h-4 text-violet-500" />}
                  sub="Based on what you browse, search, and order"
                  badge="Personalised"
                  badgeColor="bg-violet-500"
                  onSeeAll={interestCategories[0] ? () => setSelectedCategory(interestCategories[0]) : undefined}
                />
                <HScrollRow products={forYouProducts} onProductClick={handleProductClick} />
              </MarketSection>
            )}

            {/* 🆕 Just Dropped */}
            {newListings.length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-sm">
                <div className="section-stripe-emerald px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-white" />
                      <div>
                        <h2 className="text-base font-black text-white">Just Dropped</h2>
                        <p className="text-emerald-100 text-[11px]">Fresh listings added today</p>
                      </div>
                      <span className="ml-1 bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">NEW</span>
                    </div>
                    <button className="text-white/80 text-xs font-bold flex items-center gap-1">
                      See all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-4 py-4">
                  <HScrollRow products={newListings} onProductClick={handleProductClick} />
                </div>
              </div>
            )}

            {/* 🛍️ Discover More (grid) */}
            {discoverProducts.length > 0 && (
              <MarketSection>
                <SectionHeader
                  title="Discover More"
                  icon={<ShoppingBag className="w-4 h-4 text-gray-500" />}
                  sub="Explore everything on campus"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {discoverProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 25} />
                  ))}
                </div>
              </MarketSection>
            )}

            {/* Empty state */}
            {allProducts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <ShoppingBag className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-black text-lg mb-1">No products yet</p>
                <p className="text-gray-400 text-sm mb-6">Be the first seller on your campus!</p>
                <Link href="/sell" className="btn-press inline-flex items-center gap-2 px-6 py-3 bg-BATAMART-primary text-white rounded-xl font-black text-sm shadow-lg shadow-BATAMART-primary/25">
                  <Sparkles className="w-4 h-4" /> List a Product
                </Link>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Floating Sell Button */}
      {!isApp && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40">
          <Link href="/sell" className="btn-press glow-pulse flex items-center gap-2 px-5 py-3 bg-BATAMART-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-BATAMART-primary/40">
            <Sparkles className="w-4 h-4" /> Sell
          </Link>
        </div>
      )}

    </div>
  )
}