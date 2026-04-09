'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart, Star, Share2, ChevronLeft, BadgeCheck,
  MapPin, Phone, MessageSquare, Shield, Package, Truck,
  ChevronRight, Loader2, Heart, Sparkles, AlertCircle,
  CheckCircle2, Eye, Flame, Plus, Minus, ChevronDown, ChevronUp,
  Users, TrendingUp, Camera, Tag, Award, Clock, Zap,
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { decodeProductData } from '@/lib/variants'

// Types
interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  subcategory?: string
  quantity: number
  images: string[]
  viewCount: number
  hostelName?: string
  roomNumber?: string
  landmark?: string
  createdAt: string
  sellerId: string
  seller: {
    id: string
    name: string
    avgRating: number
    trustLevel: string
    completedOrders: number
    profilePhoto?: string
  }
  _count?: { orders: number }
}

interface RelatedProduct {
  id: string
  name: string
  price: number
  images: string[]
  category: string
  seller: { name: string; trustLevel: string; avgRating: number }
  _isNameRelated: boolean
}

// CSS
const PAGE_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }

  @keyframes shimmer {
    0% { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .img-thumb {
    transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1);
    cursor: pointer;
  }
  .img-thumb:hover { transform: scale(1.06); }
  .img-thumb-active {
    outline: 2.5px solid #6366f1;
    outline-offset: 2px;
  }

  .main-img {
    transition: opacity 0.22s ease, transform 0.22s ease;
  }
  .main-img.switching {
    opacity: 0;
    transform: scale(0.98);
  }

  .add-btn {
    background: linear-gradient(135deg,#6366f1 0%,#4c1d95 100%);
    transition: all 0.22s cubic-bezier(0.34,1.4,0.64,1);
    box-shadow: 0 4px 16px rgba(99,102,241,0.35);
  }
  .add-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99,102,241,0.45);
  }
  .add-btn:active:not(:disabled) { transform: scale(0.97); }

  .variant-chip {
    transition: all 0.15s cubic-bezier(0.34,1.4,0.64,1);
    cursor: pointer;
  }
  .variant-chip:hover { transform: scale(1.04); }
  .variant-chip-active {
    background: #4f46e5 !important;
    color: white !important;
    border-color: transparent !important;
    box-shadow: 0 4px 12px rgba(79,70,229,0.3);
  }

  .trust-gold { color: #d97706; background: #fef3c7; }
  .trust-silver { color: #475569; background: #f1f5f9; }
  .trust-bronze { color: #c2410c; background: #fff7ed; }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`

// Helpers
const fmt = (n: number) => 
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className={`${sz} ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  )
}

function TrustBadge({ level }: { level: string }) {
  const cls = level === 'GOLD' ? 'trust-gold' : level === 'SILVER' ? 'trust-silver' : 'trust-bronze'
  const icon = level === 'GOLD' ? '🥇' : level === 'SILVER' ? '🥈' : '🥉'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      {icon} {level}
    </span>
  )
}

// Skeleton Components
function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        <div className="shimmer h-96 rounded-3xl" />
        <div className="shimmer h-32 rounded-3xl" />
        <div className="shimmer h-40 rounded-3xl" />
        <div className="shimmer h-24 rounded-3xl" />
      </div>
    </div>
  )
}

function RelatedCard({ product, onClick }: { product: RelatedProduct; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-36 sm:w-44 bg-white rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      style={{ border: '1px solid #f0f0f0' }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {product._isNameRelated && (
          <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Similar
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
          {product.name}
        </p>
        <p className="text-[12px] font-bold text-indigo-600">{fmt(product.price)}</p>
        <div className="flex items-center gap-1 mt-1">
          <StarRow rating={product.seller.avgRating || 0} />
        </div>
      </div>
    </div>
  )
}

function SeeMoreCard({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div
      onClick={!loading ? onClick : undefined}
      className="flex-shrink-0 w-36 sm:w-44 rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center gap-2 bg-indigo-50 border border-indigo-100"
      style={{ minHeight: '180px' }}
    >
      {loading ? (
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-bold text-indigo-700 text-center px-2">See more</p>
        </>
      )}
    </div>
  )
}

// Main Component
export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { addItem, items } = useCartStore()

  // Product state
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Image gallery
  const [activeImg, setActiveImg] = useState(0)
  const [imgSwitching, setImgSwitching] = useState(false)
  
  // Quantity & variants
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<Record<string, string[]>>({})
  const [tags, setTags] = useState<string[]>([])
  
  // Cart state
  const [addedToCart, setAddedToCart] = useState(false)
  const [cartMsg, setCartMsg] = useState('')
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'desc' | 'details' | 'reviews'>('desc')
  const [descExpanded, setDescExpanded] = useState(false)
  
  // Related products
  const [relatedNameRelated, setRelatedNameRelated] = useState<RelatedProduct[]>([])
  const [relatedOthers, setRelatedOthers] = useState<RelatedProduct[]>([])
  const [relatedSourceName, setRelatedSourceName] = useState('')
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedPage, setRelatedPage] = useState(1)
  const [relatedHasMore, setRelatedHasMore] = useState(false)
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false)
  const RELATED_PAGE_SIZE = 8
  
  // People like you
  const [peopleLikeYouBought, setPeopleLikeYouBought] = useState<RelatedProduct[]>([])
  const [peopleLikeLoading, setPeopleLikeLoading] = useState(false)
  
  // You might also like - infinite scroll
  const [alsoLikeItems, setAlsoLikeItems] = useState<RelatedProduct[]>([])
  const [alsoLikePage, setAlsoLikePage] = useState(0)
  const [alsoLikeHasMore, setAlsoLikeHasMore] = useState(true)
  const [alsoLikeLoading, setAlsoLikeLoading] = useState(false)
  const alsoLikeSentinelRef = useRef<HTMLDivElement>(null)
  const ALSO_LIKE_PAGE_SIZE = 10
  
  // Reviews
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  
  // Sticky bar
  const [showStickyBar, setShowStickyBar] = useState(false)
  const buyBoxRef = useRef<HTMLDivElement>(null)
  const relatedScrollRef = useRef<HTMLDivElement>(null)

  // Add CSS
  useEffect(() => {
    if (document.getElementById('product-css')) return
    const s = document.createElement('style')
    s.id = 'product-css'
    s.textContent = PAGE_CSS
    document.head.appendChild(s)
  }, [])

  // Sticky CTA observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => setShowStickyBar(!e.isIntersecting),
      { threshold: 0 }
    )
    if (buyBoxRef.current) observer.observe(buyBoxRef.current)
    return () => observer.disconnect()
  }, [product])

  // Fetch product
  useEffect(() => {
    if (!productId) return
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      
      const res = await fetch(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        setError('Product not found')
        return
      }
      
      const data = await res.json()
      const p = data.product || data
      setProduct(p)
      
      // Decode variants and tags
      const decoded = decodeProductData(p.description || '')
      setVariants(decoded.variants)
      setTags(decoded.tags)
      
      // Track view
      fetch(`/api/products/${productId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
      
      // Update recently viewed
      try {
        const viewed = JSON.parse(localStorage.getItem('BATAMART-recently-viewed') || '[]')
        const updated = [p, ...viewed.filter((v: any) => v.id !== p.id)].slice(0, 20)
        localStorage.setItem('BATAMART-recently-viewed', JSON.stringify(updated))
      } catch {}
      
      // Fetch related data
      fetchRelatedFirst(token)
      fetchPeopleLikeYou(token)
      
    } catch {
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const fetchPeopleLikeYou = async (token: string) => {
    setPeopleLikeLoading(true)
    try {
      const res = await fetch('/api/products/people-like-you?mode=top&pageSize=10', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) return
      const items = (data.items || [])
        .map((it: any) => ({
          ...it.product,
          _isNameRelated: false,
        }))
        .filter((p: any) => p?.id && p.id !== productId)
      setPeopleLikeYouBought(items.slice(0, 8))
    } catch {}
    finally { setPeopleLikeLoading(false) }
  }

  const fetchRelatedFirst = async (token: string) => {
    setRelatedLoading(true)
    try {
      const res = await fetch(
        `/api/products/${productId}/related?limit=${RELATED_PAGE_SIZE}&page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        setRelatedNameRelated(data.related?.nameRelated || [])
        const others: RelatedProduct[] = data.related?.others || []
        setRelatedOthers(others)
        setRelatedSourceName(data.sourceProduct?.name || '')
        setRelatedHasMore(others.length === RELATED_PAGE_SIZE)
        setRelatedPage(1)
      }
    } catch {}
    finally { setRelatedLoading(false) }
  }

  const loadMoreRelated = async () => {
    if (relatedLoadingMore) return
    setRelatedLoadingMore(true)
    try {
      const token = localStorage.getItem('token') || ''
      const nextPage = relatedPage + 1
      const res = await fetch(
        `/api/products/${productId}/related?limit=${RELATED_PAGE_SIZE}&page=${nextPage}&othersOnly=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        const newOthers: RelatedProduct[] = data.related?.others || []
        setRelatedOthers(prev => [...prev, ...newOthers])
        setRelatedPage(nextPage)
        setRelatedHasMore(newOthers.length === RELATED_PAGE_SIZE)
        setTimeout(() => {
          if (relatedScrollRef.current) {
            relatedScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' })
          }
        }, 100)
      }
    } catch {}
    finally { setRelatedLoadingMore(false) }
  }

  const loadAlsoLike = useCallback(async () => {
    if (alsoLikeLoading || !alsoLikeHasMore || !product) return
    setAlsoLikeLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const nextPage = alsoLikePage + 1
      const res = await fetch(
        `/api/products/${productId}/related?limit=${ALSO_LIKE_PAGE_SIZE}&page=${nextPage}&category=${encodeURIComponent(product.category)}&gridMode=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (data.success) {
        const items: RelatedProduct[] = data.related?.grid || data.related?.others || []
        setAlsoLikeItems(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const fresh = items.filter(p => p.id !== productId && !existingIds.has(p.id))
          return [...prev, ...fresh]
        })
        setAlsoLikePage(nextPage)
        setAlsoLikeHasMore(items.length === ALSO_LIKE_PAGE_SIZE)
      } else {
        setAlsoLikeHasMore(false)
      }
    } catch {
      setAlsoLikeHasMore(false)
    } finally {
      setAlsoLikeLoading(false)
    }
  }, [alsoLikeLoading, alsoLikeHasMore, alsoLikePage, product, productId])

  // Infinite scroll observer
  useEffect(() => {
    if (!product) return
    const sentinel = alsoLikeSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadAlsoLike()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadAlsoLike, product])

  const fetchReviews = async () => {
    if (reviews.length || reviewsLoading || !product) return
    setReviewsLoading(true)
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`/api/reviews/product?productId=${product.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch {}
    finally { setReviewsLoading(false) }
  }

  const switchImg = (idx: number) => {
    if (idx === activeImg) return
    setImgSwitching(true)
    setTimeout(() => {
      setActiveImg(idx)
      setImgSwitching(false)
    }, 180)
  }

  const handleAddToCart = () => {
    if (!product) return
    
    const variantKeys = Object.keys(variants)
    const allVariantsSelected = variantKeys.length === 0 || variantKeys.every(k => selected[k])
    
    if (!allVariantsSelected) {
      setCartMsg('Please select all options')
      setTimeout(() => setCartMsg(''), 2500)
      return
    }
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      maxQuantity: product.quantity,
      image: product.images?.[0] || '',
      sellerId: product.sellerId,
      sellerName: product.seller?.name || '',
      selectedVariants: selected,
      category: product.category,
      subcategory: product.subcategory,
      quantity,
    })
    setAddedToCart(true)
    setCartMsg('Added to cart!')
    setTimeout(() => {
      setAddedToCart(false)
      setCartMsg('')
    }, 2500)
  }

  const handleBuyNow = () => {
    if (!product) return
    
    const variantKeys = Object.keys(variants)
    const allVariantsSelected = variantKeys.length === 0 || variantKeys.every(k => selected[k])
    
    if (!allVariantsSelected) {
      setCartMsg('Please select all options')
      return
    }
    
    handleAddToCart()
    setTimeout(() => router.push('/cart'), 300)
  }

  const navigateRelated = (id: string) => {
    router.push(`/product/${id}`)
  }

  const ageDays = product
    ? (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999
  const isNew = ageDays <= 7
  const variantKeys = Object.keys(variants)
  const variantSummary = Object.entries(selected).filter(([, v]) => v).map(([, v]) => v).join(' · ')
  const alreadyInCart = items.some(i => i.productId === productId)
  const hasRelated = relatedNameRelated.length > 0 || relatedOthers.length > 0

  if (loading) return <ProductSkeleton />
  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] px-4">
      <div className="text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
        <p className="text-lg font-semibold text-gray-700">{error || 'Product not found'}</p>
        <button onClick={() => router.back()} className="text-indigo-600 font-semibold underline text-sm">
          Go back
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{product.name}</h1>
            <p className="text-gray-500 text-xs">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.name, url: window.location.href }).catch(() => {})
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-gray-700" />
            </button>
            <Link href="/cart" className="relative w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-gray-700" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 space-y-4">

        {/* Image Gallery */}
        <div className="fade-up bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {product.images?.[activeImg] ? (
              <img
                src={product.images[activeImg]}
                alt={product.name}
                className={`main-img w-full h-full object-cover ${imgSwitching ? 'switching' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-300" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {isNew && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
              )}
              {product.quantity <= 3 && product.quantity > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {product.quantity} left
                </span>
              )}
              {(product._count?.orders || 0) >= 5 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Popular
                </span>
              )}
            </div>

            {(product.viewCount || 0) > 5 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {product.viewCount} views
              </div>
            )}

            {/* Image navigation arrows */}
            {product.images?.length > 1 && (
              <>
                <button
                  onClick={() => switchImg((activeImg - 1 + product.images.length) % product.images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => switchImg((activeImg + 1) % product.images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => switchImg(i)}
                  className={`img-thumb w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-200 ${activeImg === i ? 'img-thumb-active' : ''}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Dots for mobile */}
          {product.images?.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => switchImg(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === activeImg ? 'w-4 h-1.5 bg-indigo-600' : 'w-1.5 h-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div ref={buyBoxRef} className="fade-up bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              {product.category}
            </span>
            <TrustBadge level={product.seller?.trustLevel || 'BRONZE'} />
          </div>

          <h1 className="text-xl font-black text-gray-900 leading-snug">{product.name}</h1>

          <div className="flex items-center gap-2 flex-wrap">
            <StarRow rating={product.seller?.avgRating || 0} size="md" />
            <span className="text-sm font-semibold text-amber-600">{(product.seller?.avgRating || 0).toFixed(1)}</span>
            <span className="text-sm text-gray-400">·</span>
            <span className="text-sm text-gray-500">{product._count?.orders || 0} sold</span>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{fmt(product.price)}</span>
              {quantity > 1 && (
                <span className="text-sm text-gray-500">× {quantity} = {fmt(product.price * quantity)}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 8).map(tag => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs">
            <span className={`font-bold ${product.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {product.quantity > 0 ? `✓ In Stock (${product.quantity})` : '✗ Out of Stock'}
            </span>
          </div>
        </div>

        {/* Variant Selector */}
        {variantKeys.length > 0 && (
          <div className="fade-up bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Select Options
            </h3>

            <div className="space-y-4">
              {variantKeys.map(key => {
                const vals = variants[key]
                if (!vals || vals.length === 0) return null
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                return (
                  <div key={key}>
                    <p className="text-sm font-bold text-gray-600 mb-2">
                      {label}:
                      {selected[key] && <span className="text-indigo-600 ml-1.5 font-black">{selected[key]}</span>}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vals.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSelected(prev => ({ ...prev, [key]: prev[key] === v ? '' : v }))}
                          className={`variant-chip px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                            selected[key] === v
                              ? 'variant-chip-active'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {variantSummary && (
              <div className="mt-4 bg-indigo-50 rounded-xl px-4 py-2.5">
                <p className="text-xs text-indigo-600 font-bold">Selected: {variantSummary}</p>
              </div>
            )}
          </div>
        )}

        {/* Quantity Selector */}
        <div className="fade-up bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 font-black hover:border-indigo-400 hover:text-indigo-600 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-black text-gray-900 text-lg w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(product.quantity, q + 1))}
                className="w-9 h-9 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 font-black hover:border-indigo-400 hover:text-indigo-600 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Seller Info */}
        {product.seller && (
          <div className="fade-up bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
                {product.seller.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-gray-900">{product.seller.name}</span>
                  {product.seller.trustLevel === 'GOLD' && <BadgeCheck className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRow rating={product.seller.avgRating || 0} />
                  <span className="text-xs text-gray-500">{product.seller.completedOrders || 0} sales</span>
                </div>
              </div>
              <Link href={`/seller/${product.sellerId}`}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                View Shop <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Location info - only show if present */}
            {(product.hostelName || product.landmark) && (
              <div className="flex items-start gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{[product.hostelName, product.roomNumber, product.landmark].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs: Description, Details, Reviews */}
        <div className="fade-up bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className="flex border-b border-gray-100">
            {(['desc', 'details', 'reviews'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  if (tab === 'reviews') fetchReviews()
                }}
                className={`flex-1 py-3 text-sm font-bold text-gray-500 transition-all border-b-2 ${
                  activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent'
                }`}
              >
                {tab === 'desc' ? 'Description' : tab === 'details' ? 'Details' : `Reviews (${reviews.length})`}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'desc' && (
              <div>
                {product.description ? (
                  <div>
                    <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${!descExpanded && product.description.length > 200 ? 'line-clamp-4' : ''}`}>
                      {product.description.split(' | ')[0]}
                    </p>
                    {product.description.length > 200 && (
                      <button
                        onClick={() => setDescExpanded(e => !e)}
                        className="flex items-center gap-1 text-indigo-600 text-sm font-semibold mt-2 hover:underline"
                      >
                        {descExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description provided.</p>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Category', value: product.category },
                  { label: 'Subcategory', value: product.subcategory || '—' },
                  { label: 'In Stock', value: `${product.quantity} units` },
                  { label: 'Seller', value: product.seller?.name },
                  { label: 'Trust Level', value: product.seller?.trustLevel },
                  { label: 'Listed', value: new Date(product.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <dt className="text-gray-500 font-medium">{label}</dt>
                    <dd className="text-gray-800 font-semibold text-right max-w-[60%] truncate">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === 'reviews' && (
              <div>
                {reviewsLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="shimmer w-9 h-9 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="shimmer h-3 w-24 rounded" />
                          <div className="shimmer h-3 w-full rounded" />
                          <div className="shimmer h-3 w-3/4 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No reviews yet</p>
                    <p className="text-xs text-gray-300 mt-1">Be the first to buy and review this product</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {r.reviewer?.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800">{r.reviewer?.name || 'Buyer'}</p>
                            <StarRow rating={r.rating} />
                          </div>
                          {r.comment && (
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.comment}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products - Horizontal Scroll */}
        {hasRelated && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Related Products
              </h2>
            </div>

            {relatedLoading ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-shrink-0 w-36 sm:w-44">
                    <div className="shimmer aspect-square rounded-2xl" />
                    <div className="bg-white p-2 space-y-1.5 mt-1 rounded-b-2xl">
                      <div className="shimmer h-3 w-full rounded" />
                      <div className="shimmer h-3 w-2/3 rounded" />
                      <div className="shimmer h-4 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div ref={relatedScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                {relatedNameRelated.map(p => (
                  <RelatedCard key={p.id} product={p} onClick={() => navigateRelated(p.id)} />
                ))}
                {relatedOthers.map(p => (
                  <RelatedCard key={p.id} product={p} onClick={() => navigateRelated(p.id)} />
                ))}
                {relatedHasMore && (
                  <SeeMoreCard onClick={loadMoreRelated} loading={relatedLoadingMore} />
                )}
              </div>
            )}
          </div>
        )}

        {/* People Like You Bought */}
        {(peopleLikeLoading || peopleLikeYouBought.length > 0) && (
          <div className="fade-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                People Like You Bought
              </h2>
            </div>

            {peopleLikeLoading ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex-shrink-0 w-36 sm:w-44">
                    <div className="shimmer aspect-square rounded-2xl" />
                    <div className="bg-white p-2 space-y-1.5 mt-1 rounded-b-2xl">
                      <div className="shimmer h-3 w-full rounded" />
                      <div className="shimmer h-3 w-2/3 rounded" />
                      <div className="shimmer h-4 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                {peopleLikeYouBought.map(p => (
                  <RelatedCard key={p.id} product={p} onClick={() => navigateRelated(p.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* You Might Also Like - Infinite Scroll Grid */}
        <div className="fade-up">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            You Might Also Like
          </h2>

          {alsoLikeItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {alsoLikeItems.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigateRelated(p.id)}
                  className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ border: '1px solid #f0f0f0' }}
                >
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-indigo-600">{fmt(p.price)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <StarRow rating={p.seller?.avgRating || 0} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading skeletons for infinite scroll */}
          {alsoLikeLoading && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid #f0f0f0' }}>
                  <div className="shimmer aspect-square w-full" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="shimmer h-3 w-full rounded" />
                    <div className="shimmer h-3 w-2/3 rounded" />
                    <div className="shimmer h-4 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* End of list message */}
          {!alsoLikeHasMore && alsoLikeItems.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-4 py-2">
              You've seen it all! 🎉
            </p>
          )}

          {/* Intersection observer sentinel */}
          <div ref={alsoLikeSentinelRef} className="h-1 w-full" />
        </div>

        {/* Trust Badges */}
        <div className="fade-up grid grid-cols-3 gap-3">
          {[
            { icon: <Shield className="w-4 h-4 text-emerald-600" />, label: 'Escrow Protected', bg: 'bg-emerald-50' },
            { icon: <Truck className="w-4 h-4 text-blue-600" />, label: 'Fast Delivery', bg: 'bg-blue-50' },
            { icon: <Package className="w-4 h-4 text-indigo-600" />, label: 'Verified Seller', bg: 'bg-indigo-50' },
          ].map((b, i) => (
            <div key={i} className={`${b.bg} rounded-2xl p-3 text-center`}>
              <div className="flex justify-center mb-1">{b.icon}</div>
              <p className="text-[10px] font-bold text-gray-600">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      {product.quantity > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl px-4 py-3 transition-transform duration-300 ${
          showStickyBar ? 'translate-y-0' : 'translate-y-full'
        } sm:translate-y-0`}>
          <div className="max-w-2xl mx-auto flex gap-3">
            <Link
              href="/cart"
              className="w-12 h-12 flex-shrink-0 rounded-2xl border-2 border-indigo-200 flex items-center justify-center relative hover:border-indigo-400 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              {alreadyInCart && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />}
            </Link>

            <button
              onClick={handleAddToCart}
              className="flex-1 add-btn text-white font-black rounded-2xl py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addedToCart ? (
                <><CheckCircle2 className="w-4 h-4" /> Added to Cart!</>
              ) : (
                <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              className="flex-1 bg-gray-900 text-white font-black rounded-2xl py-3 flex items-center justify-center gap-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Buy Now
            </button>
          </div>

          {cartMsg && (
            <p className="text-center text-xs text-red-500 font-semibold mt-1.5">
              {cartMsg}
            </p>
          )}
        </div>
      )}

      {product.quantity === 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="font-black text-gray-500">This product is out of stock</p>
          </div>
        </div>
      )}
    </div>
  )
}