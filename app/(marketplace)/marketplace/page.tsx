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
  BadgeCheck, Timer, Percent, MapPin, Bell, Menu,
  ChevronDown, Grid3X3, List, Sliders,
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

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
    50% { box-shadow: 0 0 0 6px rgba(99,102,241,0.15); }
  }
  .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }

  .product-card {
    transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.3s ease;
  }
  .product-card:hover {
    transform: translateY(-4px) scale(1.015);
    box-shadow: 0 20px 48px rgba(0,0,0,0.12), 0 4px 16px rgba(99,102,241,0.08);
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
  .cat-btn:hover:not(.cat-active) { transform: scale(1.05); }
  .cat-btn:active { transform: scale(0.95); }

  .search-input { transition: box-shadow 0.25s ease, background 0.25s ease; }
  .search-input:focus-within {
    box-shadow: 0 0 0 3px rgba(99,102,241,0.25), 0 2px 8px rgba(0,0,0,0.06) !important;
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

  .batamart-header {
    background: linear-gradient(135deg, #4c1d95 0%, #6366f1 60%, #4c1d95 100%);
  }

  .scroll-section {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .scroll-section > * {
    scroll-snap-align: start;
  }

  .cat-tile {
    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.25s ease;
  }
  .cat-tile:hover {
    transform: translateY(-4px) scale(1.04);
    box-shadow: 0 16px 40px rgba(0,0,0,0.12);
  }
  .cat-tile:active { transform: scale(0.97); }

  .deal-card {
    transition: transform 0.3s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.3s ease;
  }
  .deal-card:hover { transform: translateY(-5px); box-shadow: 0 20px 48px rgba(0,0,0,0.13); }
  .deal-card:active { transform: scale(0.97); }
  .deal-card:hover .product-img { transform: scale(1.07); }

  @keyframes heroBannerIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .hero-banner-enter {
    animation: heroBannerIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  .mini-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .mini-card:hover { transform: scale(1.03); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
  .mini-card:active { transform: scale(0.97); }
  .mini-card:hover .product-img { transform: scale(1.05); }

  .section-header-line::after {
    content: '';
    display: block;
    height: 3px;
    width: 40px;
    background: #6366f1;
    border-radius: 2px;
    margin-top: 4px;
  }
`

const CATEGORIES = [
  { name: 'All', icon: '🛍️', color: '#6366f1' },
  { name: 'Fashion & Clothing', icon: '👔', color: '#ec4899' },
  { name: 'Food Services', icon: '🍔', color: '#f97316' },
  { name: 'Room Essentials', icon: '🏠', color: '#0891b2' },
  { name: 'School Supplies', icon: '🎒', color: '#16a34a' },
  { name: 'Tech Gadgets', icon: '🎧', color: '#7c3aed' },
  { name: 'Cosmetics', icon: '💄', color: '#db2777' },
  { name: 'Snacks', icon: '🍿', color: '#d97706' },
  { name: 'Books', icon: '📚', color: '#2563eb' },
]

const TRENDING_SEARCHES = ['iPhone', 'Sneakers', 'Laptop', 'Jollof Rice', 'Textbooks', 'Earbuds', 'Braids', 'Power Bank']
const RECENT_SEARCHES_KEY = 'BATAMART-recent-searches'
const RECENTLY_VIEWED_KEY = 'BATAMART-recently-viewed'

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

// Amazon-style category spotlight tiles
const CATEGORY_SPOTLIGHTS = [
  {
    title: 'Level up your Tech',
    categories: ['Earbuds', 'Laptops', 'Power Banks', 'Accessories'],
    icon: '🎧',
    bg: 'from-violet-50 to-indigo-50',
    accent: '#6366f1',
    catFilter: 'Tech Gadgets',
  },
  {
    title: 'Campus Fashion',
    categories: ['Hoodies', 'Sneakers', 'Bags', 'Accessories'],
    icon: '👔',
    bg: 'from-pink-50 to-rose-50',
    accent: '#ec4899',
    catFilter: 'Fashion & Clothing',
  },
  {
    title: 'Room Essentials',
    categories: ['Bedding', 'Storage', 'Lighting', 'Decor'],
    icon: '🏠',
    bg: 'from-sky-50 to-blue-50',
    accent: '#0891b2',
    catFilter: 'Room Essentials',
  },
  {
    title: 'Food & Snacks',
    categories: ['Jollof Rice', 'Snacks', 'Drinks', 'Meal Prep'],
    icon: '🍔',
    bg: 'from-orange-50 to-amber-50',
    accent: '#f97316',
    catFilter: 'Food Services',
  },
  {
    title: 'School Supplies',
    categories: ['Textbooks', 'Stationery', 'Calculators', 'Notes'],
    icon: '🎒',
    bg: 'from-emerald-50 to-green-50',
    accent: '#16a34a',
    catFilter: 'School Supplies',
  },
  {
    title: 'Beauty & Care',
    categories: ['Skincare', 'Makeup', 'Hair', 'Perfume'],
    icon: '💄',
    bg: 'from-fuchsia-50 to-pink-50',
    accent: '#db2777',
    catFilter: 'Cosmetics',
  },
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
  const discounts = [10, 15, 20, 25, 30, 0, 0, 0]
  return discounts[hash % discounts.length]
}

function getStockLevel(productId: string) {
  const hash = productId.charCodeAt(0) + productId.charCodeAt(1)
  const levels = [null, null, null, 3, 5, 7, null, null]
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
// Product Card
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
    <div onClick={onClick} className="product-card card-enter bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col group"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img src={product.images[0] || '/placeholder.png'} alt={product.name} className="product-img w-full h-full object-cover" />
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
        {discount > 0 && (
          <div className="float-badge absolute top-2 right-2 discount-badge text-white text-[11px] font-black px-2 py-1 rounded-lg">
            -{discount}%
          </div>
        )}
        {product.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}
        <div className="quick-actions absolute bottom-2 left-2 flex gap-1.5">
          <button onClick={e => { e.stopPropagation(); }} className="w-7 h-7 bg-white/95 hover:bg-red-50 rounded-lg flex items-center justify-center shadow-sm transition-colors">
            <Heart className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
          </button>
          <button onClick={e => { e.stopPropagation(); onClick(); }} className="w-7 h-7 bg-white/95 rounded-lg flex items-center justify-center shadow-sm transition-colors">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
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

        <div className="mt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-BATAMART-primary font-black text-sm sm:text-base tracking-tight">{fmt(product.price)}</span>
            {originalPrice && <span className="text-gray-400 font-medium text-[11px] line-through">{fmt(originalPrice)}</span>}
          </div>
          <StarRating rating={product.seller?.avgRating || 0} />
        </div>

        {deliveryTag && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Truck className="w-2.5 h-2.5" /> {deliveryTag}
            </span>
          </div>
        )}

        {stockLeft && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500">
              <Timer className="w-2.5 h-2.5" /> Only {stockLeft} left
            </span>
          </div>
        )}

        {signal && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[10px] viewer-anim font-semibold text-gray-500">{signal.icon} {signal.text}</span>
          </div>
        )}

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

// ─────────────────────────────────────────────
// Mini Product Card (for category spotlights)
// ─────────────────────────────────────────────
function MiniProductCard({ product, onClick }: { product: any; onClick: () => void }) {
  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)
  return (
    <div onClick={onClick} className="mini-card cursor-pointer group">
      <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
        <img src={product.images[0] || '/placeholder.png'} alt={product.name} className="product-img w-full h-full object-cover" />
      </div>
      <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{product.name}</p>
      <p className="text-xs font-black text-BATAMART-primary mt-0.5">{fmt(product.price)}</p>
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-enter bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
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
// Amazon-style Category Spotlight Grid
// ─────────────────────────────────────────────
function CategorySpotlightGrid({ allProducts, onCategorySelect, onProductClick }: {
  allProducts: any[]; onCategorySelect: (cat: string) => void; onProductClick: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CATEGORY_SPOTLIGHTS.map((spot) => {
        const catProducts = allProducts
          .filter(p => p.category === spot.catFilter)
          .slice(0, 4)
        return (
          <div key={spot.title} className={`cat-tile card-enter bg-gradient-to-br ${spot.bg} rounded-2xl overflow-hidden border border-white shadow-sm cursor-pointer`}
            onClick={() => onCategorySelect(spot.catFilter)}>
            <div className="p-3 pb-1">
              <p className="text-sm font-black text-gray-900 leading-tight">{spot.title}</p>
            </div>
            {catProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-1 p-2 pt-1">
                {catProducts.map(p => (
                  <div key={p.id} onClick={e => { e.stopPropagation(); onProductClick(p.id) }}
                    className="aspect-square rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src={p.images[0] || '/placeholder.png'} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - catProducts.length) }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-white/60 flex items-center justify-center text-2xl">{spot.icon}</div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 p-2 pt-1">
                {spot.categories.slice(0, 4).map((cat, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-white/70 flex flex-col items-center justify-center p-1">
                    <span className="text-lg">{spot.icon}</span>
                    <span className="text-[8px] font-bold text-gray-600 text-center leading-tight mt-0.5">{cat}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="px-3 pb-3">
              <span style={{ color: spot.accent }} className="text-[11px] font-black flex items-center gap-1">
                Shop now <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Best Sellers Row (Amazon-style horizontal scroll with big images)
// ─────────────────────────────────────────────
function BestSellersRow({ products, onProductClick, title, subtitle }: {
  products: any[]; onProductClick: (id: string) => void; title: string; subtitle?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)
  const scrollBy = (dir: number) => rowRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-end justify-between px-5 pt-5 pb-3 border-b border-gray-50">
        <div>
          <h2 className="text-lg font-black text-gray-900 section-header-line">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>}
        </div>
        <button className="text-xs font-bold text-BATAMART-primary flex items-center gap-1 hover:underline">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="relative group/row px-5 py-4">
        <button onClick={() => scrollBy(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-BATAMART-primary hover:text-white hover:border-BATAMART-primary">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={rowRef} className="flex gap-4 overflow-x-auto no-scrollbar scroll-section">
          {products.map((p, i) => (
            <div key={p.id} onClick={() => onProductClick(p.id)}
              className="deal-card flex-shrink-0 w-36 sm:w-44 cursor-pointer group/card">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2.5">
                <img src={p.images[0] || '/placeholder.png'} alt={p.name} className="product-img w-full h-full object-cover" />
              </div>
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
              <p className="text-xs font-black text-BATAMART-primary mt-1">{fmt(p.price)}</p>
              {p.seller?.avgRating > 0 && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] text-gray-500 font-medium">{p.seller.avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => scrollBy(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-BATAMART-primary hover:text-white hover:border-BATAMART-primary">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Deals Row (bigger cards, striped section)
// ─────────────────────────────────────────────
function DealsSection({ products, onProductClick, sectionClass, icon, title, subtitle, badge }: {
  products: any[]; onProductClick: (id: string) => void; sectionClass: string;
  icon: React.ReactNode; title: string; subtitle: string; badge?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: number) => rowRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className={`${sectionClass} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{title}</h2>
                {badge && <span className="badge-pulse bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
              </div>
              <p className="text-white/70 text-[11px] mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button className="text-white/80 text-xs font-bold flex items-center gap-1">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="bg-white px-5 py-4 relative group/row">
        <button onClick={() => scrollBy(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div ref={rowRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-section">
          {products.map((p, i) => (
            <div key={p.id} className="flex-shrink-0 w-40 sm:w-44">
              <ProductCard product={p} onClick={() => onProductClick(p.id)} delay={i * 40} />
            </div>
          ))}
        </div>
        <button onClick={() => scrollBy(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
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
    <div className="ptr-indicator pointer-events-none fixed top-0 left-0 right-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${Math.min(pullDistance, PULL_MAX) - 64}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        opacity: isRefreshing ? 1 : progress,
      }}>
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
      <span className="viewer-anim font-bold">🔴 LIVE marketplace</span>
      <span className="w-px h-3 bg-gray-200" />
      <span className="flex items-center gap-1">
        <Users className="w-3 h-3 text-violet-400" />
        Students buying now
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
        .then(data => { if (data.user?.university?.shortName) setUniversityShortName(data.user.university.shortName) })
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
    try { searched = (JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') as string[]).join(',') } catch { }
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
          (data.products || []).filter((p: any) => p.isPersonalised).map((p: any) => p.category)
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

  const forYouProducts = useMemo(() => allProducts.filter(p => p.isPersonalised).slice(0, 12), [allProducts])
  const trendingProducts = useMemo(() => allProducts.filter(p => p.isTrending).slice(0, 12), [allProducts])
  const newListings = useMemo(() => allProducts.filter(p => p.isNew).slice(0, 12), [allProducts])
  const discoverProducts = useMemo(() => {
    const shown = new Set([...forYouProducts.map(p => p.id), ...trendingProducts.map(p => p.id), ...newListings.map(p => p.id)])
    return allProducts.filter(p => !shown.has(p.id)).slice(0, 16)
  }, [allProducts, forYouProducts, trendingProducts, newListings])

  const filteredByCategory = useMemo(() =>
    selectedCategory === 'All' ? allProducts : allProducts.filter(p => p.category === selectedCategory),
    [allProducts, selectedCategory]
  )

  // Group products by category for "Best Sellers" rows (Amazon style)
  const productsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const cat of CATEGORIES.slice(1)) {
      map[cat.name] = allProducts.filter(p => p.category === cat.name).slice(0, 10)
    }
    return map
  }, [allProducts])

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
      <div className="drop-in fixed z-[9998] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: '320px', overflowY: 'auto' }}>
        <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {!searchInput.trim() ? 'Recent Searches' : 'Suggestions'}
          </span>
          {!searchInput.trim() && recentSearches.length > 0 && (
            <span className="text-[10px] text-BATAMART-primary font-bold">RECENT</span>
          )}
        </div>
        {suggestions.map((s: any, i) => (
          <button key={i}
            onMouseDown={(e) => { e.preventDefault(); isClickingSuggestionRef.current = true }}
            onClick={() => {
              isClickingSuggestionRef.current = false
              if (s.type === 'product') { handleProductClick(s.id); return }
              handleSearch(s.label)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
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
            className="w-full flex items-center gap-3 px-4 py-3 bg-BATAMART-primary/5 hover:bg-BATAMART-primary/10 transition-colors border-t border-gray-50">
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
    <div className="min-h-screen bg-[#f0f2f5]">
      {SuggestionsDropdown}

      {(pullDistance > 0 || isRefreshing) && (
        <PullIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      )}

      {/* ── PROMO TICKER ── */}
      <PromoTicker />

      {/* ══════════════════════════════════════════
          AMAZON-STYLE HEADER with search bar on top
      ══════════════════════════════════════════ */}
      <header className="batamart-header sticky top-0 z-40 shadow-lg"
        style={{
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.2, 20)}px)` : undefined,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">

          {/* Top row: Logo + Search + Actions */}
          <div className="flex items-center gap-2 sm:gap-4 py-3">
            {/* Logo / Brand */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-white font-black text-lg leading-none tracking-tight">BATAMART</p>
                {universityShortName && (
                  <p className="text-white/60 text-[10px] font-semibold flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {universityShortName}
                  </p>
                )}
              </div>
            </div>

            {/* ── SEARCH BAR (center, prominent) ── */}
            <div ref={searchRef} className="flex-1 min-w-0">
              <div className="search-input flex items-center gap-2 bg-white rounded-xl shadow-md px-3 sm:px-4 ring-2 ring-transparent">
                {/* Category dropdown hint */}
                <div className="hidden sm:flex items-center gap-1 border-r border-gray-200 pr-3 mr-1 flex-shrink-0 cursor-pointer hover:text-BATAMART-primary transition-colors"
                  onClick={() => {}}>
                  <span className="text-xs font-bold text-gray-500 whitespace-nowrap">All</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </div>
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={e => { setSearchInput(e.target.value); updateDropdownPos(); setShowSuggestions(true) }}
                  onFocus={() => { updateDropdownPos(); setShowSuggestions(true) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products, sellers, categories..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 py-3 min-w-0"
                  autoComplete="off"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); setShowSuggestions(false) }} className="text-gray-400 hover:text-gray-600 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => handleSearch()}
                  className="flex-shrink-0 px-4 py-2 bg-BATAMART-primary hover:bg-BATAMART-dark text-white rounded-lg font-black text-sm transition-colors">
                  <span className="hidden sm:inline">Search</span>
                  <Search className="w-4 h-4 sm:hidden" />
                </button>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Link href="/sell"
                className="btn-press glow-pulse hidden sm:flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-3.5 py-2 rounded-xl font-bold text-xs ring-1 ring-white/20 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Sell
              </Link>
              <Link href="/report"
                className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-xl font-semibold text-xs ring-1 ring-white/10 transition-colors">
                <AlertCircle className="w-3.5 h-3.5" />
              </Link>
              {!isApp && (
                <Link href="/sell" className="btn-press sm:hidden flex items-center justify-center w-10 h-10 bg-white/15 rounded-xl">
                  <Sparkles className="w-4 h-4 text-white" />
                </Link>
              )}
            </div>
          </div>

          {/* ── CATEGORY NAV (sub-header strip) ── */}
          <div className="flex items-center justify-between gap-2 pb-2 border-t border-white/10 pt-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1">
              {CATEGORIES.map(cat => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
                  className={`cat-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap text-[11px] sm:text-xs flex-shrink-0 transition-all ${
                    selectedCategory === cat.name
                      ? 'cat-active bg-white text-BATAMART-primary shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}>
                  <span>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className="sm:hidden">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 flex-shrink-0">
              {(['feed', 'grid'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all"
                  style={viewMode === mode
                    ? { background: 'white', color: '#6366f1' }
                    : { color: 'rgba(255,255,255,0.65)' }}>
                  {mode === 'feed' ? <List className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Trending chips strip */}
          <div className="flex items-center gap-2 pb-2.5 overflow-hidden">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
            </span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {TRENDING_SEARCHES.map(tag => (
                <button key={tag} onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                  className="hot-tag flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white text-white/80 hover:text-BATAMART-primary rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition-all">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-28 space-y-4">

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} delay={i * 60} />)}
          </div>

        ) : selectedCategory !== 'All' ? (
          /* ── CATEGORY FILTER VIEW ── */
          <div>
            <div className="flex items-center gap-2 mb-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
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
            <div className="flex items-center justify-between mb-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
              <LiveStatsBar count={allProducts.length} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allProducts.map((p, i) => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 30} />)}
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════
              AMAZON-STYLE PERSONALISED FEED
          ══════════════════════════════════════════ */
          <div className="space-y-4">

            {/* Live stats */}
            {allProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <LiveStatsBar count={allProducts.length} />
              </div>
            )}

            {/* ── CATEGORY SPOTLIGHT GRID (Amazon top section) ── */}
            {allProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-gray-800 section-header-line">Shop by Category</h2>
                </div>
                <CategorySpotlightGrid
                  allProducts={allProducts}
                  onCategorySelect={setSelectedCategory}
                  onProductClick={handleProductClick}
                />
              </div>
            )}

            {/* ── FLASH DEALS (orange stripe) ── */}
            {trendingProducts.length > 0 && (
              <DealsSection
                products={trendingProducts}
                onProductClick={handleProductClick}
                sectionClass="section-stripe-orange"
                icon={<Flame className="w-5 h-5 text-white" />}
                title="Flash Deals"
                subtitle="Trending on campus right now"
                badge="HOT"
              />
            )}

            {/* ── FOR YOU (personalised) ── */}
            {forYouProducts.length > 0 && (
              <BestSellersRow
                products={forYouProducts}
                onProductClick={handleProductClick}
                title="Picked for You"
                subtitle="Based on what you browse, search, and order"
              />
            )}

            {/* ── RECENTLY VIEWED ── */}
            {recentlyViewed.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-end justify-between px-5 pt-5 pb-3 border-b border-gray-50">
                  <div>
                    <h2 className="text-base font-black text-gray-900 section-header-line">Recently Viewed</h2>
                    <p className="text-xs text-gray-400 font-medium mt-1">Pick up where you left off</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {recentlyViewed.slice(0, 8).map((p, i) => (
                      <MiniProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── JUST DROPPED (emerald stripe) ── */}
            {newListings.length > 0 && (
              <DealsSection
                products={newListings}
                onProductClick={handleProductClick}
                sectionClass="section-stripe-emerald"
                icon={<Sparkles className="w-5 h-5 text-white" />}
                title="Just Dropped"
                subtitle="Fresh listings added today"
                badge="NEW"
              />
            )}

            {/* ── BEST SELLERS: TECH GADGETS ── */}
            {productsByCategory['Tech Gadgets']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Tech Gadgets']}
                onProductClick={handleProductClick}
                title="Best Sellers in Tech Gadgets"
                subtitle="Top picks from campus techies"
              />
            )}

            {/* ── BEST SELLERS: FASHION ── */}
            {productsByCategory['Fashion & Clothing']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Fashion & Clothing']}
                onProductClick={handleProductClick}
                title="Best Sellers in Campus Fashion"
                subtitle="Style up your university life"
              />
            )}

            {/* ── BEST SELLERS: FOOD ── */}
            {productsByCategory['Food Services']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Food Services']}
                onProductClick={handleProductClick}
                title="Best Sellers in Food & Dining"
                subtitle="Eat well, study harder"
              />
            )}

            {/* ── INTEREST CATEGORIES ── */}
            {interestCategories.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-violet-500" />
                  <h2 className="text-base font-black text-gray-900">Your Interests</h2>
                  <span className="text-[10px] text-gray-400 font-medium">Based on your browsing</span>
                </div>
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
              </div>
            )}

            {/* ── BEST SELLERS: SCHOOL SUPPLIES ── */}
            {productsByCategory['School Supplies']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['School Supplies']}
                onProductClick={handleProductClick}
                title="Best Sellers in School Supplies"
                subtitle="Gear up for the semester"
              />
            )}

            {/* ── BEST SELLERS: COSMETICS ── */}
            {productsByCategory['Cosmetics']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Cosmetics']}
                onProductClick={handleProductClick}
                title="Best Sellers in Beauty & Cosmetics"
                subtitle="Top-rated by campus students"
              />
            )}

            {/* ── DISCOVER MORE (full grid) ── */}
            {discoverProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-black text-gray-900 section-header-line">Discover More</h2>
                    <p className="text-xs text-gray-400 mt-1">Explore everything on campus</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Sliders className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-medium">Filter</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {discoverProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p.id)} delay={i * 25} />
                  ))}
                </div>
              </div>
            )}

            {/* ── ROOM ESSENTIALS ── */}
            {productsByCategory['Room Essentials']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Room Essentials']}
                onProductClick={handleProductClick}
                title="Finds for Your Room"
                subtitle="Make your hostel feel like home"
              />
            )}

            {/* ── BOOKS ── */}
            {productsByCategory['Books']?.length > 0 && (
              <BestSellersRow
                products={productsByCategory['Books']}
                onProductClick={handleProductClick}
                title="Books & Academic Resources"
                subtitle="Study smarter with the right materials"
              />
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

      {/* Floating Sell Button (mobile) */}
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