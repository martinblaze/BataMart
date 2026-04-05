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
  BadgeCheck, Timer, Bell, Gift, Percent, Crown,
  MapPin, Lock, Bolt,
} from 'lucide-react'
import { isSplashPending } from '@/components/SplashScreen'

// ─── Pull-to-refresh constants (unchanged) ───────────────────────────────────
const PULL_THRESHOLD = 130
const PULL_MAX = 175
const PULL_DEAD_ZONE = 12
const PULL_RESIST = 0.38

// ─── ALL CSS ──────────────────────────────────────────────────────────────────
const ANIM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap');

  /* ─── Base Tokens ─── */
  :root {
    --bm-violet: #6366f1;
    --bm-dark:   #4c1d95;
    --bm-flash:  #f97316;
    --bm-neon:   #a855f7;
    --bm-gold:   #f59e0b;
    --bm-red:    #ef4444;
    --bm-green:  #10b981;
  }

  /* ─── Entrance ─── */
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(22px) scale(0.97); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .card-enter {
    opacity:0;
    animation: fadeSlideUp 0.42s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes sectionIn {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .section-enter {
    opacity:0;
    animation: sectionIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  /* ─── Skeleton shimmer ─── */
  @keyframes shimmerSkel {
    0%   { background-position:-600px 0; }
    100% { background-position:600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%);
    background-size:1200px 100%;
    animation: shimmerSkel 1.5s ease-in-out infinite;
  }

  /* ─── Pull-to-refresh ─── */
  @keyframes ptr-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .ptr-spinning { animation: ptr-spin 0.7s linear infinite; }
  .ptr-indicator { transition: opacity 0.2s ease; }

  /* ─────────────────────────────────────────────
     HERO BACKGROUND ANIMATION
  ───────────────────────────────────────────── */
  @keyframes heroOrb1 {
    0%,100%  { transform: translate(-10%,-10%) scale(1); }
    50%      { transform: translate(5%,15%) scale(1.15); }
  }
  @keyframes heroOrb2 {
    0%,100%  { transform: translate(10%,10%) scale(1); }
    50%      { transform: translate(-8%,-12%) scale(1.2); }
  }
  @keyframes heroOrb3 {
    0%,100%  { transform: translate(0,0) scale(1); }
    33%      { transform: translate(-15%,10%) scale(1.1); }
    66%      { transform: translate(12%,-8%) scale(0.9); }
  }
  .hero-orb-1 { animation: heroOrb1 12s ease-in-out infinite; }
  .hero-orb-2 { animation: heroOrb2 15s ease-in-out infinite; }
  .hero-orb-3 { animation: heroOrb3 18s ease-in-out infinite; }

  /* ─── Scanline overlay ─── */
  .scanlines::after {
    content:'';
    position:absolute;
    inset:0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events:none;
    z-index:1;
  }

  /* ─── Diagonal stripe BG ─── */
  .stripe-bg {
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 8px,
      rgba(255,255,255,0.03) 8px,
      rgba(255,255,255,0.03) 16px
    );
  }

  /* ─────────────────────────────────────────────
     TICKER
  ───────────────────────────────────────────── */
  @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .ticker-inner { animation: ticker 22s linear infinite; }
  .ticker-wrap:hover .ticker-inner { animation-play-state:paused; }

  /* ─────────────────────────────────────────────
     PRODUCT CARD — THE BEAST
  ───────────────────────────────────────────── */
  .product-card {
    transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease;
    position: relative;
  }
  .product-card::before {
    content:'';
    position:absolute;
    inset:-1px;
    border-radius:18px;
    background: linear-gradient(135deg, rgba(99,102,241,0), rgba(99,102,241,0));
    transition: background 0.3s ease;
    z-index:0;
    pointer-events:none;
  }
  .product-card:hover::before {
    background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3));
  }
  .product-card:hover {
    transform: translateY(-8px) scale(1.022);
    box-shadow:
      0 0 0 1px rgba(99,102,241,0.2),
      0 24px 60px rgba(99,102,241,0.18),
      0 8px 20px rgba(0,0,0,0.1);
  }
  .product-card:active {
    transform: scale(0.96);
    transition: transform 0.1s ease;
  }
  .product-img { transition: transform 0.6s cubic-bezier(0.22,1,0.36,1); }
  .product-card:hover .product-img { transform: scale(1.1); }

  /* card inner content sits above ::before */
  .product-card > * { position: relative; z-index: 1; }

  /* Quick actions */
  .quick-actions {
    opacity:0;
    transform:translateY(8px);
    transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.4,0.64,1);
  }
  .product-card:hover .quick-actions { opacity:1; transform:translateY(0); }

  /* Price flash on hover */
  .price-tag { transition: color 0.2s ease, transform 0.2s ease; }
  .product-card:hover .price-tag { color: var(--bm-violet); transform: scale(1.05); }

  /* ─────────────────────────────────────────────
     BADGES & PULSES
  ───────────────────────────────────────────── */
  @keyframes badgePop {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.08); }
  }
  .badge-pulse { animation: badgePop 1.8s ease-in-out infinite; }

  @keyframes hotBadge {
    0%,100% { box-shadow: 0 2px 8px rgba(239,68,68,0.5); }
    50%     { box-shadow: 0 2px 20px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.3); }
  }
  .hot-glow { animation: hotBadge 1.6s ease-in-out infinite; }

  @keyframes newBadge {
    0%,100% { box-shadow: 0 2px 8px rgba(16,185,129,0.4); }
    50%     { box-shadow: 0 2px 20px rgba(16,185,129,0.8), 0 0 30px rgba(16,185,129,0.2); }
  }
  .new-glow { animation: newBadge 2s ease-in-out infinite; }

  @keyframes discountShake {
    0%,100% { transform:rotate(-3deg) scale(1); }
    25%     { transform:rotate(3deg) scale(1.05); }
    75%     { transform:rotate(-2deg) scale(1.02); }
  }
  .discount-shake { animation: discountShake 3s ease-in-out infinite; }

  @keyframes stockUrgency {
    0%,100% { color: #ef4444; }
    50%     { color: #dc2626; opacity:0.7; }
  }
  .stock-urgent { animation: stockUrgency 1.2s ease-in-out infinite; }

  @keyframes viewerPulse {
    0%,100% { opacity:1; }
    50%     { opacity:0.6; }
  }
  .viewer-pulse { animation: viewerPulse 2s ease-in-out infinite; }

  @keyframes liveRed {
    0%,100% { background:#ef4444; }
    50%     { background:#fca5a5; }
  }
  .live-dot { animation: liveRed 1s ease-in-out infinite; }

  /* ─────────────────────────────────────────────
     SECTION HEADERS
  ───────────────────────────────────────────── */
  @keyframes fireFlicker {
    0%,100% { filter: drop-shadow(0 0 4px rgba(249,115,22,0.8)); }
    33%     { filter: drop-shadow(0 0 12px rgba(239,68,68,1)); }
    66%     { filter: drop-shadow(0 0 6px rgba(249,115,22,0.6)); }
  }
  .fire-flicker { animation: fireFlicker 1.4s ease-in-out infinite; }

  @keyframes sparkleRot {
    from { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.2); }
    to   { transform: rotate(360deg) scale(1); }
  }
  .sparkle-spin { animation: sparkleRot 3s linear infinite; }

  /* ─────────────────────────────────────────────
     HERO ELEMENTS
  ───────────────────────────────────────────── */
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
    50%     { box-shadow: 0 0 0 8px rgba(99,102,241,0.15), 0 0 30px rgba(99,102,241,0.1); }
  }
  .glow-pulse { animation: glowPulse 2.5s ease-in-out infinite; }

  @keyframes shimmerBtn {
    0%   { background-position:200% center; }
    100% { background-position:-200% center; }
  }
  .shimmer-btn {
    background: linear-gradient(90deg, #fff 0%, #e0e7ff 25%, #fff 50%, #e0e7ff 75%, #fff 100%);
    background-size: 400% auto;
    animation: shimmerBtn 3s linear infinite;
    color: #4c1d95 !important;
  }

  /* Counter badges */
  @keyframes countBounce {
    0%  { transform: scale(1); }
    50% { transform: scale(1.3) rotate(-5deg); }
    100%{ transform: scale(1); }
  }
  .count-bounce { animation: countBounce 0.4s cubic-bezier(0.34,1.56,0.64,1); }

  /* ─────────────────────────────────────────────
     CATEGORY NAV
  ───────────────────────────────────────────── */
  .cat-btn {
    transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1);
    position: relative;
    overflow: hidden;
  }
  .cat-btn::after {
    content:'';
    position:absolute;
    inset:0;
    background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%);
    opacity:0;
    transition: opacity 0.2s ease;
  }
  .cat-btn:hover::after { opacity:1; }
  .cat-btn:hover:not(.cat-active) { transform:scale(1.08) translateY(-1px); }
  .cat-btn:active { transform:scale(0.94); }
  .cat-active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    box-shadow: 0 4px 16px rgba(99,102,241,0.4), 0 0 0 2px rgba(99,102,241,0.15) !important;
  }

  /* ─────────────────────────────────────────────
     SEARCH
  ───────────────────────────────────────────── */
  .search-input { transition: box-shadow 0.25s ease, background 0.25s ease; }
  .search-input:focus-within {
    box-shadow: 0 0 0 3px rgba(99,102,241,0.2), 0 2px 12px rgba(99,102,241,0.1) !important;
    background: white !important;
  }

  .hot-tag { transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1); }
  .hot-tag:hover { transform: scale(1.1) translateY(-2px); }
  .hot-tag:active { transform: scale(0.93); }

  /* ─────────────────────────────────────────────
     PROMO TICKER
  ───────────────────────────────────────────── */
  @keyframes tickerBg {
    0%   { background-position:0% 50%; }
    100% { background-position:200% 50%; }
  }
  .ticker-bar {
    background: linear-gradient(90deg, #4c1d95, #6366f1, #8b5cf6, #6366f1, #4c1d95);
    background-size:300% 100%;
    animation: tickerBg 6s linear infinite;
  }

  /* ─────────────────────────────────────────────
     FLASH DEAL SECTION — diagonal cut header
  ───────────────────────────────────────────── */
  .flash-header {
    background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #fbbf24 100%);
    clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);
    padding-bottom: 2rem;
  }
  .flash-header-alt {
    background: linear-gradient(135deg, #4c1d95 0%, #6366f1 60%, #8b5cf6 100%);
    clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);
    padding-bottom: 2rem;
  }
  .new-header {
    background: linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%);
    clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);
    padding-bottom: 2rem;
  }

  /* ─────────────────────────────────────────────
     SECTION CARDS — glassy
  ───────────────────────────────────────────── */
  .glass-card {
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.6);
  }

  /* ─────────────────────────────────────────────
     INTEREST PILLS
  ───────────────────────────────────────────── */
  .interest-pill {
    transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1);
    position: relative;
    overflow: hidden;
  }
  .interest-pill:hover {
    transform: scale(1.08) translateY(-2px);
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    color: white !important;
    border-color: transparent !important;
    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
  }
  .interest-pill:active { transform: scale(0.95); }

  /* ─────────────────────────────────────────────
     BTN PRESS
  ───────────────────────────────────────────── */
  .btn-press { transition: transform 0.15s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.15s ease; }
  .btn-press:hover  { transform:scale(1.04); }
  .btn-press:active { transform:scale(0.95); }

  /* rv-card */
  .rv-card {
    transition: transform 0.28s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.28s ease;
  }
  .rv-card:hover {
    transform:translateY(-5px) scale(1.04);
    box-shadow: 0 16px 36px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.15);
  }
  .rv-card:hover .product-img { transform:scale(1.08); }
  .rv-card:active { transform:scale(0.96); }

  /* ─────────────────────────────────────────────
     DROP-IN SUGGESTIONS
  ───────────────────────────────────────────── */
  @keyframes dropIn {
    from { opacity:0; transform:translateY(-10px) scale(0.96); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  .drop-in { animation: dropIn 0.2s cubic-bezier(0.22,1,0.36,1) forwards; }

  /* ─────────────────────────────────────────────
     FLOATING SELL BUTTON — pulsing ring
  ───────────────────────────────────────────── */
  @keyframes ringPulse {
    0%   { transform:scale(1); opacity:0.6; }
    100% { transform:scale(2.2); opacity:0; }
  }
  .sell-btn-wrap { position:relative; }
  .sell-btn-wrap::before, .sell-btn-wrap::after {
    content:'';
    position:absolute;
    inset:0;
    border-radius:1rem;
    background: rgba(99,102,241,0.4);
    animation: ringPulse 2s ease-out infinite;
  }
  .sell-btn-wrap::after { animation-delay: 1s; }

  /* ─────────────────────────────────────────────
     SCROLLBAR HIDE
  ───────────────────────────────────────────── */
  .no-scrollbar::-webkit-scrollbar { display:none; }
  .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }

  /* ─────────────────────────────────────────────
     PROMO CARD HOVER (hero)
  ───────────────────────────────────────────── */
  @keyframes promoPop {
    0%,100% { transform: scale(1) rotate(0deg); }
    25%     { transform: scale(1.06) rotate(-1deg); }
    75%     { transform: scale(1.04) rotate(1deg); }
  }
  .promo-card-pop { animation: promoPop 4s ease-in-out infinite; }

  /* ─────────────────────────────────────────────
     LIGHTNING BOLT
  ───────────────────────────────────────────── */
  @keyframes boltFlash {
    0%,90%,100% { opacity:1; filter:drop-shadow(0 0 4px rgba(251,191,36,0.8)); }
    95%          { opacity:0.3; filter:none; }
  }
  .bolt-flash { animation: boltFlash 2.5s ease-in-out infinite; }

  /* ─────────────────────────────────────────────
     SECTION DIVIDER PULSE
  ───────────────────────────────────────────── */
  @keyframes dividerShimmer {
    0%   { background-position:0% 50%; }
    100% { background-position:200% 50%; }
  }
  .divider-shimmer {
    background: linear-gradient(90deg, transparent, #6366f1, #a855f7, #6366f1, transparent);
    background-size:200% 100%;
    animation: dividerShimmer 3s linear infinite;
    height: 1px;
  }

  /* ─── Trust bar shimmer bg ─── */
  .trust-bg {
    background: linear-gradient(90deg, #fafbff 0%, #f0f0ff 50%, #fafbff 100%);
  }

  /* ─── Scroll snap for horizontal rows ─── */
  .h-scroll-snap { scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
  .h-scroll-snap > * { scroll-snap-align: start; }

  /* ─── Sold count chip ─── */
  @keyframes soldCount {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.12) rotate(-2deg); }
  }
  .sold-chip { animation: soldCount 2.2s ease-in-out infinite; }

  /* GRID BG for sections */
  .grid-bg {
    background-image:
      linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* ─── Crown glow ─── */
  @keyframes crownGlow {
    0%,100% { filter: drop-shadow(0 0 4px rgba(245,158,11,0.7)); }
    50%     { filter: drop-shadow(0 0 14px rgba(245,158,11,1)); }
  }
  .crown-glow { animation: crownGlow 2s ease-in-out infinite; }

  /* number counter spin */
  @keyframes numSpin {
    from { transform: translateY(-100%); opacity:0; }
    to   { transform: translateY(0); opacity:1; }
  }
  .num-spin { animation: numSpin 0.3s ease forwards; }
`

// ─── DATA / CONSTANTS ────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'All',               icon: '🛍️' },
  { name: 'Fashion & Clothing', icon: '👔' },
  { name: 'Food Services',      icon: '🍔' },
  { name: 'Room Essentials',    icon: '🏠' },
  { name: 'School Supplies',    icon: '🎒' },
  { name: 'Tech Gadgets',       icon: '🎧' },
  { name: 'Cosmetics',          icon: '💄' },
  { name: 'Snacks',             icon: '🍿' },
  { name: 'Books',              icon: '📚' },
]

const TRENDING_SEARCHES = ['iPhone','Sneakers','Laptop','Jollof Rice','Textbooks','Earbuds','Braids','Power Bank']
const RECENT_SEARCHES_KEY = 'BATAMART-recent-searches'
const RECENTLY_VIEWED_KEY = 'BATAMART-recently-viewed'

const TICKER_ITEMS = [
  '🔥 HOT DEALS — Grab before they\'re gone!',
  '⚡ FLASH SALE — Only today!',
  '🚀 FREE Delivery over ₦30,000',
  '🛡️ 100% Buyer Protection',
  '✅ Verified Campus Sellers Only',
  '👑 Top-Rated Products This Week',
  '📦 Same-Day Campus Pickup Available',
  '💳 Secure Wallet Payments',
  '🎓 Exclusively for Students',
  '📣 New Drops Every Hour!',
]

const PROMO_BANNERS = [
  { emoji: '🔥', title: 'Flash Sale', sub: 'Up to 40% OFF', grad: 'from-orange-500 to-red-600' },
  { emoji: '⚡', title: 'Just Dropped', sub: 'Fresh picks added', grad: 'from-violet-600 to-purple-700' },
  { emoji: '🚀', title: 'Free Delivery', sub: 'Orders over ₦30,000', grad: 'from-emerald-500 to-teal-600' },
  { emoji: '🎓', title: 'Campus Only', sub: 'Verified sellers', grad: 'from-blue-500 to-indigo-600' },
]

function seededRand(id: string, salt: number) {
  let h = salt
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return Math.abs(h)
}
function getDiscount(id: string) {
  const discounts = [0,0,0,10,15,20,25,30]
  return discounts[seededRand(id, 1) % discounts.length]
}
function getStockLeft(id: string) {
  const levels = [null,null,null,null,2,3,4,5,7]
  return levels[seededRand(id, 2) % levels.length]
}
function getDeliveryTag(id: string) {
  const tags = [null,'Free Delivery','Campus Pickup','Fast Delivery',null]
  return tags[seededRand(id, 3) % tags.length]
}
function getViewers(id: string) {
  return 4 + (seededRand(id, 4) % 34)
}
function getSoldToday(id: string) {
  return 1 + (seededRand(id, 5) % 19)
}
function getSignalType(id: string, idx: number) {
  const types = ['viewers','sold','selling','added']
  return types[(seededRand(id, 6) + idx) % types.length]
}

function parseTags(description: string): string[] {
  if (!description) return []
  if (description.includes(' | ')) return description.split(' | ').map(t => t.trim()).filter(Boolean)
  return []
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function TrustPill({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
    GOLD:   { bg:'bg-amber-50',  text:'text-amber-700',  ring:'ring-amber-200',  dot:'bg-amber-400'  },
    SILVER: { bg:'bg-slate-50',  text:'text-slate-600',  ring:'ring-slate-200',  dot:'bg-slate-400'  },
    BRONZE: { bg:'bg-orange-50', text:'text-orange-700', ring:'ring-orange-200', dot:'bg-orange-400' },
  }
  const t = map[level] ?? map.BRONZE
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${t.bg} ${t.text} ${t.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {level}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-2.5 h-2.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-[10px] font-bold text-gray-500 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 💥 PRODUCT CARD — Maximum density, max information
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ product, onClick, delay = 0 }: { product: any; onClick: () => void; delay?: number }) {
  const tags        = parseTags(product.description)
  const fmt         = (p: number) => new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 }).format(p)
  const discount    = getDiscount(product.id)
  const stockLeft   = getStockLeft(product.id)
  const deliveryTag = getDeliveryTag(product.id)
  const viewers     = getViewers(product.id)
  const soldToday   = getSoldToday(product.id)
  const signalType  = getSignalType(product.id, delay)
  const origPrice   = discount ? Math.round(product.price * (1 + discount / 100)) : null

  return (
    <div
      onClick={onClick}
      className="product-card card-enter bg-white rounded-[18px] overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* ── Image zone ── */}
      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio:'1/1' }}>
        <img
          src={product.images[0] || '/placeholder.png'}
          alt={product.name}
          className="product-img w-full h-full object-cover"
        />

        {/* gradient overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Top-left badges stacked */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.isTrending && (
            <span className="hot-glow badge-pulse inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black text-white"
              style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
              <Flame className="w-2.5 h-2.5" /> HOT
            </span>
          )}
          {product.isNew && (
            <span className="new-glow inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black text-white"
              style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}>
              <Sparkles className="w-2.5 h-2.5" /> NEW
            </span>
          )}
          {product.isPersonalised && !product.isTrending && !product.isNew && (
            <span className="badge-pulse inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black text-white"
              style={{ background:'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
              <Heart className="w-2.5 h-2.5 fill-white" /> YOU
            </span>
          )}
        </div>

        {/* Discount corner ribbon */}
        {discount > 0 && (
          <div className="discount-shake absolute top-2 right-2 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white text-[11px] font-black leading-none"
            style={{ background:'linear-gradient(135deg,#ef4444,#b91c1c)', boxShadow:'0 3px 10px rgba(239,68,68,0.6)' }}>
            <div className="text-center">
              <div className="text-[9px] leading-none opacity-80">OFF</div>
              <div>{discount}%</div>
            </div>
          </div>
        )}

        {/* Photo count */}
        {product.images?.length > 1 && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold backdrop-blur-sm">
            📷 {product.images.length}
          </div>
        )}

        {/* Quick actions on hover */}
        <div className="quick-actions absolute bottom-2 right-2 flex gap-1">
          <button onClick={e => e.stopPropagation()}
            className="w-7 h-7 bg-white rounded-xl flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Heart className="w-3.5 h-3.5 text-red-400" />
          </button>
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="w-7 h-7 bg-white rounded-xl flex items-center justify-center shadow-md hover:scale-110 transition-transform">
            <Eye className="w-3.5 h-3.5 text-violet-500" />
          </button>
        </div>
      </div>

      {/* ── Info zone ── */}
      <div className="p-2.5 flex flex-col flex-1 gap-1">
        {/* Category */}
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{product.category}</p>

        {/* Name */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-xs leading-snug flex-1">{product.name}</h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-semibold rounded-full border border-indigo-100">{tag}</span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
          <span className="price-tag font-black text-sm text-gray-900 tracking-tight">{fmt(product.price)}</span>
          {origPrice && (
            <span className="text-gray-400 text-[10px] font-medium line-through">{fmt(origPrice)}</span>
          )}
          {discount > 0 && (
            <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{discount}%</span>
          )}
        </div>

        {/* Stars */}
        <StarRating rating={product.seller?.avgRating || 0} />

        {/* Delivery */}
        {deliveryTag && (
          <div className="flex items-center gap-1">
            <Truck className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-600">{deliveryTag}</span>
          </div>
        )}

        {/* Urgency + signal row */}
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {stockLeft && (
            <span className="stock-urgent inline-flex items-center gap-0.5 text-[9px] font-black text-red-500">
              <Timer className="w-2.5 h-2.5" /> Only {stockLeft} left!
            </span>
          )}
          {signalType === 'viewers' && (
            <span className="viewer-pulse inline-flex items-center gap-0.5 text-[9px] font-semibold text-orange-500">
              🔥 {viewers} viewing
            </span>
          )}
          {signalType === 'sold' && (
            <span className="sold-chip inline-flex items-center gap-0.5 text-[9px] font-semibold text-violet-600">
              🛒 {soldToday} sold today
            </span>
          )}
          {signalType === 'selling' && (
            <span className="badge-pulse inline-flex items-center gap-0.5 text-[9px] font-semibold text-orange-600">
              ⚡ Selling fast
            </span>
          )}
          {signalType === 'added' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-500">
              👀 Just added
            </span>
          )}
        </div>

        {/* Seller row */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-gray-50 mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <Link href={`/seller/${product.seller?.id}`}
              className="text-[10px] font-bold text-gray-500 hover:text-violet-600 truncate transition-colors"
              onClick={e => e.stopPropagation()}>
              {product.seller?.name}
            </Link>
          </div>
          <TrustPill level={product.seller?.trustLevel || 'BRONZE'} />
        </div>
      </div>
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card-enter bg-white rounded-[18px] overflow-hidden border border-gray-100 shadow-sm" style={{ animationDelay:`${delay}ms` }}>
      <div className="shimmer" style={{ aspectRatio:'1/1' }} />
      <div className="p-2.5 space-y-2">
        <div className="h-2 shimmer rounded-full w-1/3" />
        <div className="h-3.5 shimmer rounded-full w-full" />
        <div className="h-3 shimmer rounded-full w-3/4" />
        <div className="h-4 shimmer rounded-full w-1/2 mt-2" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 📣 PROMO TICKER
// ─────────────────────────────────────────────────────────────────────────────
function PromoTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div className="ticker-bar overflow-hidden py-1.5 ticker-wrap select-none">
      <div className="ticker-inner flex whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="text-white text-[11px] font-bold mx-5 flex-shrink-0 flex items-center gap-1">
            {item}
            <span className="mx-3 text-white/30">•</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ TRUST BAR
// ─────────────────────────────────────────────────────────────────────────────
function TrustBar() {
  const items = [
    { icon: <Shield className="w-3.5 h-3.5 text-violet-500" />, label:'Buyer Protection', sub:'Every order covered' },
    { icon: <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />, label:'Verified Sellers', sub:'Identity confirmed' },
    { icon: <Truck className="w-3.5 h-3.5 text-emerald-500" />, label:'Campus Delivery', sub:'Fast & reliable' },
    { icon: <Crown className="w-3.5 h-3.5 text-amber-500 crown-glow" />, label:'Top Rated', sub:'4.5★ avg' },
    { icon: <Lock className="w-3.5 h-3.5 text-gray-500" />, label:'Secure Payments', sub:'Wallet protected' },
    { icon: <Users className="w-3.5 h-3.5 text-pink-500" />, label:'5,000+ Students', sub:'Active community' },
  ]
  return (
    <div className="trust-bg border-b border-indigo-100/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
          {items.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                {s.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-800 whitespace-nowrap">{s.label}</p>
                <p className="text-[9px] text-gray-400 whitespace-nowrap">{s.sub}</p>
              </div>
              {i < items.length - 1 && <div className="w-px h-5 bg-gray-200 mx-2 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({
  title, icon, sub, badge, badgeClass='bg-red-500 text-white',
  onSeeAll, delay=0, counter
}: {
  title:string; icon:React.ReactNode; sub?:string; badge?:string;
  badgeClass?:string; onSeeAll?:()=>void; delay?:number; counter?:number
}) {
  return (
    <div className="section-enter flex items-center justify-between mb-3" style={{ animationDelay:`${delay}ms` }}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm border border-white/60"
          style={{ background:'linear-gradient(135deg,#f3f4f6,#fff)' }}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
            {badge && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeClass}`}>
                {badge}
              </span>
            )}
            {counter !== undefined && (
              <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {counter} items
              </span>
            )}
          </div>
          {sub && <p className="text-[10px] text-gray-400 font-medium leading-tight">{sub}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll}
          className="btn-press flex items-center gap-0.5 text-[11px] font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors border border-violet-100">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HORIZONTAL SCROLL ROW with nav arrows
// ─────────────────────────────────────────────────────────────────────────────
function HScrollRow({ products, onProductClick }: { products: any[]; onProductClick:(id:string)=>void }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 210, behavior:'smooth' })
  return (
    <div className="relative group/row">
      <button onClick={() => scroll(-1)}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 hover:bg-violet-600 hover:text-white hover:border-violet-600">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div ref={rowRef} className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 h-scroll-snap">
        {products.map((p, i) => (
          <div key={p.id} className="flex-shrink-0 w-36 sm:w-40">
            <ProductCard product={p} onClick={() => onProductClick(p.id)} delay={i * 50} />
          </div>
        ))}
      </div>
      <button onClick={() => scroll(1)}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 hover:bg-violet-600 hover:text-white hover:border-violet-600">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FLASH DEAL SECTION BLOCK  (diagonal-cut header)
// ─────────────────────────────────────────────────────────────────────────────
function FlashSection({
  title, sub, badge, headerClass, iconEl, products, onProductClick, onSeeAll
}: {
  title:string; sub:string; badge:string; headerClass:string;
  iconEl:React.ReactNode; products:any[]; onProductClick:(id:string)=>void; onSeeAll?:()=>void
}) {
  if (!products.length) return null
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* diagonal header */}
      <div className={`${headerClass} px-4 pt-4 pb-8 relative`}>
        <div className="stripe-bg absolute inset-0 opacity-30" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-white">{iconEl}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">{title}</h2>
                <span className="badge-pulse bg-white/25 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-white/30">
                  {badge}
                </span>
              </div>
              <p className="text-white/70 text-[11px] font-medium">{sub}</p>
            </div>
          </div>
          {onSeeAll && (
            <button onClick={onSeeAll} className="text-white/80 text-xs font-black flex items-center gap-0.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl transition-colors border border-white/20">
              All <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      {/* content lifted over clip path */}
      <div className="bg-white px-4 pb-4 -mt-5 relative z-10">
        <HScrollRow products={products} onProductClick={onProductClick} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE STATS STRIP
// ─────────────────────────────────────────────────────────────────────────────
function LiveStatsStrip({ count }: { count: number }) {
  if (!count) return null
  return (
    <div className="flex items-center gap-3 flex-wrap text-[10px] font-semibold text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="live-dot w-2 h-2 rounded-full inline-block flex-shrink-0" />
        <span className="font-black text-gray-800 text-[11px]">{count}</span>
        <span>products live</span>
      </span>
      <span className="w-px h-3 bg-gray-200" />
      <span className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-violet-400" />
        <span>Students buying <span className="font-black text-gray-700">right now</span></span>
      </span>
      <span className="w-px h-3 bg-gray-200" />
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3 text-emerald-400" />
        <span>Campus-only sellers</span>
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PULL INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function PullIndicator({ pullDistance, isRefreshing }: { pullDistance: number; isRefreshing: boolean }) {
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const ready    = pullDistance >= PULL_THRESHOLD
  return (
    <div className="ptr-indicator pointer-events-none fixed top-0 left-0 right-0 z-50 flex justify-center"
      style={{
        transform:`translateY(${Math.min(pullDistance, PULL_MAX) - 64}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        opacity: isRefreshing ? 1 : progress,
      }}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-lg border border-gray-100"
        style={{ transform:`scale(${0.85 + progress * 0.15})` }}>
        <RefreshCw className={`w-4 h-4 text-violet-500 ${isRefreshing ? 'ptr-spinning' : ''}`}
          style={{ transform: isRefreshing ? undefined : `rotate(${progress * 220}deg)` }} />
        <span className="text-xs font-bold text-gray-600">
          {isRefreshing ? 'Refreshing…' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██████████████████████████████████████████████████████
//  MAIN PAGE
// ██████████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const isApp = searchParams.get('app') === 'true' ||
    (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)

  const [splashDone, setSplashDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return !isSplashPending()
  })

  const [allProducts, setAllProducts]               = useState<any[]>([])
  const [loading, setLoading]                       = useState(true)
  const [selectedCategory, setSelectedCategory]     = useState('All')
  const [viewMode, setViewMode]                     = useState<'feed' | 'grid'>('feed')
  const [recentlyViewed, setRecentlyViewed]         = useState<any[]>([])
  const [interestCategories, setInterestCategories] = useState<string[]>([])
  const [searchInput, setSearchInput]               = useState('')
  const [recentSearches, setRecentSearches]         = useState<string[]>([])
  const [showSuggestions, setShowSuggestions]       = useState(false)
  const [mounted, setMounted]                       = useState(false)
  const [dropdownPos, setDropdownPos]               = useState({ top:0, left:0, width:0 })
  const [universityShortName, setUniversityShortName] = useState('')
  const [promoBanner, setPromoBanner]               = useState(0)
  const [pullDistance, setPullDistance]             = useState(0)
  const [isRefreshing, setIsRefreshing]             = useState(false)

  const inputRef                = useRef<HTMLInputElement>(null)
  const searchRef               = useRef<HTMLDivElement>(null)
  const isClickingSuggRef       = useRef(false)

  // rotate promo banner
  useEffect(() => {
    const t = setInterval(() => setPromoBanner(p => (p + 1) % PROMO_BANNERS.length), 4500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (splashDone) return
    const h = () => setSplashDone(true)
    window.addEventListener('batamart:splash-done', h)
    const fb = setTimeout(() => setSplashDone(true), 4000)
    return () => { window.removeEventListener('batamart:splash-done', h); clearTimeout(fb) }
  }, [splashDone])

  useEffect(() => {
    if (document.getElementById('BATAMART-anim')) return
    const s = document.createElement('style'); s.id = 'BATAMART-anim'; s.textContent = ANIM_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    setMounted(true)
    try { setRecentlyViewed(JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]')) } catch {}
    try { setRecentSearches(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')) } catch {}
    fetchFeed()
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', { headers:{ Authorization:`Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.user?.university?.shortName) setUniversityShortName(d.user.university.shortName) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (isClickingSuggRef.current) return
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (selectedCategory === 'All') fetchFeed(); else fetchByCategory(selectedCategory)
  }, [selectedCategory])

  // pull-to-refresh
  useEffect(() => {
    let startY = 0, latestDelta = 0, inPullMode = false
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return
      startY = e.touches[0].clientY; latestDelta = 0; inPullMode = false
    }
    const onTouchMove = (e: TouchEvent) => {
      if (startY === 0 || isRefreshing) return
      if (window.scrollY > 0) { startY = 0; inPullMode = false; setPullDistance(0); return }
      const delta = e.touches[0].clientY - startY
      if (!inPullMode) {
        if (delta < PULL_DEAD_ZONE) return
        if (delta < 0) { startY = 0; return }
        inPullMode = true
      }
      latestDelta = delta
      setPullDistance(Math.min(delta * PULL_RESIST, PULL_MAX))
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
    document.addEventListener('touchstart', onTouchStart, { passive:true })
    document.addEventListener('touchmove',  onTouchMove,  { passive:false })
    document.addEventListener('touchend',   onTouchEnd,   { passive:true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing])

  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropdownPos({ top:r.bottom+8, left:r.left, width:r.width })
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateDropdownPos)
    window.addEventListener('scroll', updateDropdownPos)
    return () => { window.removeEventListener('resize', updateDropdownPos); window.removeEventListener('scroll', updateDropdownPos) }
  }, [updateDropdownPos])

  const buildFeedSignals = () => {
    let viewed='', searched=''
    try { viewed = Array.from(new Set((JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)||'[]') as any[]).map(p=>p.category).filter(Boolean))).join(',') } catch {}
    try { searched = (JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)||'[]') as string[]).join(',') } catch {}
    return { viewed, searched }
  }

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const { viewed, searched } = buildFeedSignals()
      const params = new URLSearchParams()
      if (viewed)   params.set('viewed', viewed)
      if (searched) params.set('searched', searched)
      const res  = await fetch(`/api/products/feed?${params.toString()}`, { headers:{ Authorization:`Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) {
        setAllProducts(data.products || [])
        const cats = Array.from(new Set((data.products||[]).filter((p:any)=>p.isPersonalised).map((p:any)=>p.category))) as string[]
        setInterestCategories(cats.slice(0,4))
      }
    } catch {} finally { setLoading(false) }
  }

  const fetchByCategory = async (category: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res  = await fetch(`/api/products?category=${encodeURIComponent(category)}`, { headers:{ Authorization:`Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setAllProducts(data.products || [])
    } catch {} finally { setLoading(false) }
  }

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 }).format(p)

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)||'[]')
      const product = allProducts.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v:any) => v.id !== id)].slice(0,20)
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
        setRecentlyViewed(updated)
      }
    } catch {}
    if (token) fetch(`/api/products/${id}/view`,{ method:'POST', headers:{ Authorization:`Bearer ${token}` } }).catch(()=>{})
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const handleSearch = (searchTerm?: string) => {
    const q = (searchTerm || searchInput).trim()
    if (!q) return
    try {
      const updated = [q, ...recentSearches.filter(s=>s!==q)].slice(0,8)
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {}
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key==='Enter') { e.preventDefault(); handleSearch() }
  }

  const forYouProducts = useMemo(()=>allProducts.filter(p=>p.isPersonalised).slice(0,10), [allProducts])
  const trendingProducts = useMemo(()=>allProducts.filter(p=>p.isTrending).slice(0,10), [allProducts])
  const newListings = useMemo(()=>allProducts.filter(p=>p.isNew).slice(0,10), [allProducts])
  const discoverProducts = useMemo(()=>{
    const shown = new Set([...forYouProducts,...trendingProducts,...newListings].map(p=>p.id))
    return allProducts.filter(p=>!shown.has(p.id)).slice(0,16)
  }, [allProducts, forYouProducts, trendingProducts, newListings])

  const filteredByCategory = useMemo(()=>
    selectedCategory==='All' ? allProducts : allProducts.filter(p=>p.category===selectedCategory),
    [allProducts, selectedCategory]
  )

  const suggestions = useMemo(()=>{
    const q = searchInput.trim().toLowerCase()
    if (!q) return recentSearches.slice(0,6).map(s=>({ type:'recent', label:s }))
    const pm = allProducts
      .filter(p=>{ const tags=parseTags(p.description); return p.name.toLowerCase().includes(q)||tags.some((t:string)=>t.toLowerCase().includes(q)) })
      .slice(0,5).map(p=>({ type:'product', label:p.name, sublabel:fmt(p.price), id:p.id, image:p.images[0] }))
    const tm = TRENDING_SEARCHES.filter(s=>s.toLowerCase().includes(q)).slice(0,3).map(s=>({ type:'trending', label:s }))
    return [...pm, ...tm]
  }, [searchInput, allProducts, recentSearches])

  const SuggestionsDropdown = mounted && showSuggestions && suggestions.length > 0
    ? createPortal(
        <div className="drop-in fixed z-[9998] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ top:dropdownPos.top, left:dropdownPos.left, width:dropdownPos.width, maxHeight:'320px', overflowY:'auto' }}>
          <div className="px-4 py-2.5 border-b border-gray-50 bg-gray-50/80 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              {!searchInput.trim() ? 'Recent Searches' : 'Suggestions'}
            </span>
          </div>
          {suggestions.map((s: any, i) => (
            <button key={i}
              onMouseDown={e=>{e.preventDefault();isClickingSuggRef.current=true}}
              onClick={()=>{isClickingSuggRef.current=false; if(s.type==='product'){handleProductClick(s.id);return}; handleSearch(s.label)}}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 transition-colors text-left group">
              {s.type==='product' && s.image
                ? <img src={s.image} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-sm" alt="" />
                : s.type==='recent'
                  ? <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"><Clock className="w-4 h-4 text-gray-400" /></div>
                  : <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-violet-500" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-violet-700 transition-colors">{s.label}</p>
                {s.sublabel && <p className="text-xs text-violet-500 font-black">{s.sublabel}</p>}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
            </button>
          ))}
          {searchInput.trim() && (
            <button
              onMouseDown={e=>{e.preventDefault();isClickingSuggRef.current=true}}
              onClick={()=>{isClickingSuggRef.current=false;handleSearch()}}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-t border-gray-50">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-black text-violet-600">Search &quot;{searchInput}&quot;</span>
              <ArrowRight className="w-3.5 h-3.5 text-violet-400 ml-auto flex-shrink-0" />
            </button>
          )}
        </div>,
        document.body
      ) : null

  if (!splashDone) return <div className="min-h-screen bg-white" />

  return (
    <div className="min-h-screen" style={{ background:'#f2f3f7' }}>
      {SuggestionsDropdown}
      {(pullDistance > 0 || isRefreshing) && (
        <PullIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      )}

      {/* ═══════════════════════════════════════
          TICKER
      ═══════════════════════════════════════ */}
      <PromoTicker />

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <div
        className="relative overflow-hidden scanlines"
        style={{
          background:'linear-gradient(135deg, #2e1065 0%, #4c1d95 30%, #6366f1 65%, #818cf8 100%)',
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance*0.3,28)}px)` : undefined,
          transition: isRefreshing || pullDistance===0 ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="hero-orb-1 absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
            style={{ background:'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }} />
          <div className="hero-orb-2 absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
            style={{ background:'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)' }} />
          <div className="hero-orb-3 absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full"
            style={{ background:'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)' }} />

          {/* dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-0">

          {/* Rotating promo strip */}
          <div className="mb-4 h-8 overflow-hidden">
            {PROMO_BANNERS.map((b, i) => (
              <div key={i}
                className={`flex transition-all duration-700 ${i === promoBanner ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 absolute'}`}
                style={{ position: i !== promoBanner ? 'absolute' : 'relative' }}>
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${b.grad} px-3 py-1.5 rounded-2xl shadow-lg`}>
                  <span className="text-sm">{b.emoji}</span>
                  <span className="text-white font-black text-xs tracking-wide">{b.title}</span>
                  <span className="w-px h-3 bg-white/30" />
                  <span className="text-white/80 text-[11px] font-medium">{b.sub}</span>
                  <Zap className="w-3 h-3 text-white/70 bolt-flash" />
                </div>
              </div>
            ))}
          </div>

          {/* Main hero row */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
            <div className="space-y-2.5 w-full sm:w-auto section-enter">
              {/* LIVE chip */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white/90 text-[10px] font-black ring-1 ring-white/20 backdrop-blur-sm uppercase tracking-wider">
                  <Zap className="w-3 h-3 fill-white" /> Campus Marketplace
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/25 text-red-100 text-[10px] font-black ring-1 ring-red-400/40">
                  <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" />
                  LIVE
                </span>
              </div>

              {/* Big headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05]"
                style={{ fontFamily:"'Syne', sans-serif", textShadow:'0 2px 20px rgba(0,0,0,0.3)' }}>
                Shop Smart,
                <br />
                <span style={{ color:'#c4b5fd' }}>
                  Buy Local{universityShortName ? ` @ ${universityShortName}` : ''}
                </span>
              </h1>

              <p className="text-white/60 text-sm max-w-xs">
                Your campus marketplace — products picked just for you, by people who get it.
              </p>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { icon:<Shield className="w-3 h-3" />, label:'Verified Sellers' },
                  { icon:<Award className="w-3 h-3" />, label:'Rated Products' },
                  { icon:<Package className="w-3 h-3" />, label:'Campus Delivery' },
                  { icon:<CheckCircle className="w-3 h-3" />, label:'Buyer Protection' },
                ].map(({ icon, label }, i) => (
                  <span key={label}
                    className="section-enter inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-white/85 text-[10px] font-bold ring-1 ring-white/15 backdrop-blur-sm"
                    style={{ animationDelay:`${120 + i*60}ms` }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="hidden sm:flex flex-col gap-2.5 mt-2 section-enter flex-shrink-0" style={{ animationDelay:'80ms' }}>
              <Link href="/sell"
                className="btn-press shimmer-btn flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm shadow-xl"
                style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.25)' }}>
                <Sparkles className="w-4 h-4 text-violet-600" /> Start Selling
              </Link>
              <Link href="/report"
                className="btn-press flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-semibold text-sm ring-1 ring-white/20 transition-colors backdrop-blur-sm">
                <AlertCircle className="w-4 h-4" /> Report Issue
              </Link>
            </div>
          </div>

          {/* ─── SEARCH CARD ─── */}
          <div ref={searchRef} className="relative section-enter" style={{ animationDelay:'50ms' }}>
            <div className="bg-white rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.2)] p-4">

              {/* Search input row */}
              <div className="flex gap-2 sm:gap-3">
                <div className="search-input flex-1 flex items-center gap-2 bg-gray-50 ring-1 ring-gray-200 rounded-2xl px-4 group">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchInput}
                    onChange={e=>{ setSearchInput(e.target.value); updateDropdownPos(); setShowSuggestions(true) }}
                    onFocus={()=>{ updateDropdownPos(); setShowSuggestions(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search anything on campus..."
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 py-3.5 font-medium"
                    autoComplete="off"
                  />
                  {searchInput && (
                    <button onClick={()=>{ setSearchInput(''); setShowSuggestions(false) }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button onClick={()=>handleSearch()}
                  className="btn-press px-5 sm:px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-colors"
                  style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 4px 20px rgba(99,102,241,0.4)' }}>
                  Search
                </button>
                {!isApp && (
                  <Link href="/sell"
                    className="btn-press sm:hidden flex items-center justify-center w-12 rounded-2xl text-violet-600 border border-violet-100"
                    style={{ background:'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
                    <Sparkles className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Trending chips */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400 fire-flicker" /> HOT:
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {TRENDING_SEARCHES.map(tag => (
                    <button key={tag} onClick={()=>router.push(`/search?q=${encodeURIComponent(tag)}`)}
                      className="hot-tag flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-violet-100 hover:text-violet-700 text-gray-600 rounded-xl text-[10px] font-bold whitespace-nowrap flex-shrink-0 border border-transparent hover:border-violet-200 transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          TRUST BAR
      ═══════════════════════════════════════ */}
      <TrustBar />

      {/* ═══════════════════════════════════════
          CATEGORY NAV — sticky
      ═══════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200/60"
        style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
              {CATEGORIES.map(cat => (
                <button key={cat.name} onClick={()=>setSelectedCategory(cat.name)}
                  className={`cat-btn flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap text-[11px] flex-shrink-0 ${
                    selectedCategory===cat.name
                      ? 'cat-active text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}>
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
              {(['feed','grid'] as const).map(mode => (
                <button key={mode} onClick={()=>setViewMode(mode)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-black capitalize transition-all duration-200"
                  style={viewMode===mode
                    ? { background:'white', color:'#6366f1', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }
                    : { color:'#9ca3af' }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-4">

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {Array.from({length:10}).map((_,i)=><SkeletonCard key={i} delay={i*60} />)}
          </div>

        ) : selectedCategory !== 'All' ? (
          /* ─── CATEGORY VIEW ─── */
          <div>
            {/* breadcrumb */}
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-2 mb-4 shadow-sm">
              <button onClick={()=>setSelectedCategory('All')}
                className="text-xs font-black text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> All
              </button>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-xs font-black text-gray-700">{selectedCategory}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                <Package className="w-2.5 h-2.5" /> {filteredByCategory.length} items
              </span>
            </div>
            {filteredByCategory.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-5xl mb-4">🛍️</div>
                <p className="text-gray-700 font-black text-lg mb-1">Nothing here yet</p>
                <p className="text-gray-400 text-sm mb-6">Be the first to sell in this category!</p>
                <Link href="/sell" className="btn-press inline-flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-black text-sm shadow-lg"
                  style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 6px 24px rgba(99,102,241,0.35)' }}>
                  <Sparkles className="w-4 h-4" /> List a Product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredByCategory.map((p,i)=><ProductCard key={p.id} product={p} onClick={()=>handleProductClick(p.id)} delay={i*40} />)}
              </div>
            )}
          </div>

        ) : viewMode === 'grid' ? (
          /* ─── GRID VIEW ─── */
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-4 shadow-sm">
              <LiveStatsStrip count={allProducts.length} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {allProducts.map((p,i)=><ProductCard key={p.id} product={p} onClick={()=>handleProductClick(p.id)} delay={i*25} />)}
            </div>
          </div>

        ) : (
          /* ─────────────────────────────────────────────
             PERSONALISED FEED — THE MALL
          ───────────────────────────────────────────── */
          <div className="space-y-4">

            {/* Live stats bar */}
            {allProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <LiveStatsStrip count={allProducts.length} />
              </div>
            )}

            {/* ── Interest Categories ── */}
            {interestCategories.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <SectionHeader
                  title="Your Interests"
                  icon={<Eye className="w-4 h-4 text-violet-500" />}
                  sub="Based on your browsing history"
                  badge="Personalised"
                  badgeClass="bg-violet-100 text-violet-700"
                />
                <div className="flex flex-wrap gap-2">
                  {interestCategories.map((cat, i) => {
                    const catObj = CATEGORIES.find(c=>c.name===cat)
                    return (
                      <button key={cat} onClick={()=>setSelectedCategory(cat)}
                        className="interest-pill card-enter flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 shadow-sm"
                        style={{ animationDelay:`${i*60}ms` }}>
                        <span className="text-base">{catObj?.icon}</span> {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Recently Viewed ── */}
            {recentlyViewed.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <SectionHeader
                  title="Recently Viewed"
                  icon={<Clock className="w-4 h-4 text-gray-400" />}
                  sub="Pick up where you left off"
                  counter={recentlyViewed.slice(0,8).length}
                />
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 h-scroll-snap">
                  {recentlyViewed.slice(0,8).map((p, i) => (
                    <div key={p.id} onClick={()=>handleProductClick(p.id)}
                      className="rv-card card-enter flex-shrink-0 w-32 sm:w-36 cursor-pointer rounded-2xl overflow-hidden border border-gray-100 bg-gray-50"
                      style={{ animationDelay:`${i*50}ms` }}>
                      <div className="overflow-hidden" style={{ aspectRatio:'1/1' }}>
                        <img src={p.images?.[0]||'/placeholder.png'} alt={p.name} className="product-img w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">{p.name}</p>
                        <p className="text-xs font-black mt-1" style={{ color:'#6366f1' }}>{fmt(p.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 🔥 FLASH DEALS (Trending) ── */}
            <FlashSection
              title="Flash Deals"
              sub="Trending hard on campus"
              badge="🔥 HOT"
              headerClass="flash-header"
              iconEl={<Flame className="w-6 h-6 fire-flicker" />}
              products={trendingProducts}
              onProductClick={handleProductClick}
              onSeeAll={()=>setSelectedCategory('All')}
            />

            {/* divider shimmer */}
            {trendingProducts.length > 0 && <div className="divider-shimmer rounded-full" />}

            {/* ── ⭐ FOR YOU ── */}
            {forYouProducts.length > 0 && (
              <FlashSection
                title="Picked For You"
                sub="Based on your vibe & history"
                badge="✨ Personal"
                headerClass="flash-header-alt"
                iconEl={<Heart className="w-6 h-6 text-white fill-white sparkle-spin" />}
                products={forYouProducts}
                onProductClick={handleProductClick}
                onSeeAll={interestCategories[0] ? ()=>setSelectedCategory(interestCategories[0]) : undefined}
              />
            )}

            {forYouProducts.length > 0 && <div className="divider-shimmer rounded-full" />}

            {/* ── 🆕 JUST DROPPED ── */}
            <FlashSection
              title="Just Dropped"
              sub="Fresh listings added today"
              badge="🆕 NEW"
              headerClass="new-header"
              iconEl={<Sparkles className="w-6 h-6 text-white sparkle-spin" />}
              products={newListings}
              onProductClick={handleProductClick}
            />

            {newListings.length > 0 && <div className="divider-shimmer rounded-full" />}

            {/* ── 🛍️ DISCOVER MORE (full grid) ── */}
            {discoverProducts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm grid-bg">
                <SectionHeader
                  title="Discover More"
                  icon={<ShoppingBag className="w-4 h-4 text-gray-500" />}
                  sub="Everything available on your campus"
                  counter={discoverProducts.length}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {discoverProducts.map((p,i)=>(
                    <ProductCard key={p.id} product={p} onClick={()=>handleProductClick(p.id)} delay={i*20} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {allProducts.length === 0 && (
              <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-6xl mb-4 animate-bounce">🛍️</div>
                <p className="font-black text-xl text-gray-800 mb-2">No products yet!</p>
                <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
                  Your campus marketplace is empty. Be the legend who starts it.
                </p>
                <Link href="/sell"
                  className="btn-press inline-flex items-center gap-2 px-8 py-4 text-white rounded-2xl font-black text-base shadow-xl"
                  style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 8px 32px rgba(99,102,241,0.45)' }}>
                  <Sparkles className="w-5 h-5" /> Be the First Seller
                </Link>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════
          FLOATING SELL BUTTON — pulsing rings
      ═══════════════════════════════════════ */}
      {!isApp && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 sell-btn-wrap">
          <Link href="/sell"
            className="btn-press relative z-10 flex items-center gap-2 px-5 py-3 text-white rounded-2xl font-black text-sm shadow-2xl"
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 8px 32px rgba(99,102,241,0.6)' }}>
            <Sparkles className="w-4 h-4 sparkle-spin" /> Sell
          </Link>
        </div>
      )}

    </div>
  )
}