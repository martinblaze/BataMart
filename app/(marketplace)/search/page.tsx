'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Filter, Star, ArrowRight,
  ChevronLeft, SlidersHorizontal, ChevronRight
} from 'lucide-react'

const CATEGORIES = [
  'All', 'Electronics', 'Fashion', 'Books', 'Food', 'Furniture',
  'Sports', 'Beauty', 'Stationery', 'Services', 'Other'
]

function TrustPill({ level }: { level: string }) {
  const tone = level === 'GOLD'
    ? { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-400' }
    : level === 'SILVER'
    ? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' }
    : { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {level}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs font-semibold text-gray-600 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [inputVal, setInputVal]     = useState(initialQ)
  const [products, setProducts]     = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [sortBy, setSortBy]             = useState<'recent' | 'price-low' | 'price-high'>('recent')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [hostelFilter, setHostelFilter] = useState('')
  const [minPrice, setMinPrice]         = useState('')
  const [maxPrice, setMaxPrice]         = useState('')
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)

  // Active applied filters (sent to API)
  const [appliedQuery, setAppliedQuery]       = useState(initialQ)
  const [appliedCategory, setAppliedCategory] = useState('All')
  const [appliedHostel, setAppliedHostel]     = useState('')
  const [appliedMin, setAppliedMin]           = useState<number | null>(null)
  const [appliedMax, setAppliedMax]           = useState<number | null>(null)

  // Run initial search if q param present
  useEffect(() => {
    if (initialQ) runSearch(initialQ, 'All', '', null, null)
  }, [])

  const buildUrl = (q: string, cat: string, hostel: string, min: number | null, max: number | null) => {
    const params = new URLSearchParams()
    if (q) params.set('search', q)
    if (cat && cat !== 'All') params.set('category', cat)
    if (hostel) params.set('hostel', hostel)
    if (min !== null) params.set('minPrice', String(min))
    if (max !== null) params.set('maxPrice', String(max))
    return `/api/products?${params.toString()}`
  }

  const runSearch = async (
    q: string,
    cat: string,
    hostel: string,
    min: number | null,
    max: number | null
  ) => {
    setLoading(true)
    setHasSearched(true)
    try {
      const url = buildUrl(q, cat, hostel, min, max)
      const res = await fetch(url)
      const data = await res.json()
      let results = data.products || []

      // Client-side sort only (server handles filtering)
      if (sortBy === 'price-low') results = [...results].sort((a: any, b: any) => a.price - b.price)
      if (sortBy === 'price-high') results = [...results].sort((a: any, b: any) => b.price - a.price)

      setProducts(results)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const q = inputVal.trim()
    setAppliedQuery(q)
    setAppliedCategory(selectedCategory)
    setAppliedHostel(hostelFilter)
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
    runSearch(q, selectedCategory, hostelFilter, appliedMin, appliedMax)
  }

  const applyPrice = () => {
    const min = minPrice ? parseFloat(minPrice) : null
    const max = maxPrice ? parseFloat(maxPrice) : null
    setAppliedMin(min)
    setAppliedMax(max)
    setShowPriceFilter(false)
    runSearch(appliedQuery, appliedCategory, appliedHostel, min, max)
  }

  const clearPrice = () => {
    setMinPrice(''); setMaxPrice('')
    setAppliedMin(null); setAppliedMax(null)
    setShowPriceFilter(false)
    runSearch(appliedQuery, appliedCategory, appliedHostel, null, null)
  }

  const applyCategory = (cat: string) => {
    setSelectedCategory(cat)
    setAppliedCategory(cat)
    setShowCategoryFilter(false)
    runSearch(appliedQuery, cat, appliedHostel, appliedMin, appliedMax)
  }

  const applyHostel = () => {
    setAppliedHostel(hostelFilter)
    runSearch(appliedQuery, appliedCategory, hostelFilter, appliedMin, appliedMax)
  }

  const clearAllFilters = () => {
    setSelectedCategory('All'); setAppliedCategory('All')
    setHostelFilter(''); setAppliedHostel('')
    setMinPrice(''); setMaxPrice('')
    setAppliedMin(null); setAppliedMax(null)
    runSearch(appliedQuery, 'All', '', null, null)
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed = JSON.parse(localStorage.getItem('bata-recently-viewed') || '[]')
      const product = products.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v: any) => v.id !== id)].slice(0, 20)
        localStorage.setItem('bata-recently-viewed', JSON.stringify(updated))
      }
    } catch {}
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const hasActiveFilters = appliedCategory !== 'All' || appliedHostel || appliedMin !== null || appliedMax !== null

  // Re-sort locally when sortBy changes without re-fetching
  const sortedProducts = useMemo(() => {
    const copy = [...products]
    if (sortBy === 'price-low') return copy.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-high') return copy.sort((a, b) => b.price - a.price)
    return copy
  }, [products, sortBy])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/marketplace')}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 ring-1 ring-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-bata-primary/30 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search products, specs, colors..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                autoFocus
              />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setProducts([]); setHasSearched(false) }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="flex-shrink-0 px-4 py-2.5 bg-bata-primary hover:bg-bata-dark text-white rounded-xl font-bold text-sm transition-all"
            >
              Search
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {/* Category filter */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowCategoryFilter(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap ${
                  appliedCategory !== 'All'
                    ? 'bg-bata-primary text-white border-bata-primary'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Filter className="w-3 h-3" />
                {appliedCategory !== 'All' ? appliedCategory : 'Category'}
              </button>
              {showCategoryFilter && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => applyCategory(cat)}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        appliedCategory === cat
                          ? 'text-bata-primary font-bold bg-bata-primary/5'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hostel filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5 flex-shrink-0">
              <span className="text-xs text-gray-400">🏠</span>
              <input
                type="text"
                value={hostelFilter}
                onChange={e => setHostelFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyHostel()}
                onBlur={applyHostel}
                placeholder="Hostel name..."
                className="text-xs outline-none w-28 bg-transparent text-gray-700 placeholder-gray-400"
              />
              {hostelFilter && (
                <button onClick={() => { setHostelFilter(''); setAppliedHostel(''); runSearch(appliedQuery, appliedCategory, '', appliedMin, appliedMax) }}>
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            {/* Price filter */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowPriceFilter(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap ${
                  appliedMin !== null || appliedMax !== null
                    ? 'bg-bata-primary text-white border-bata-primary'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                ₦ {appliedMin !== null || appliedMax !== null
                  ? `${appliedMin ? formatPrice(appliedMin) : '0'} – ${appliedMax ? formatPrice(appliedMax) : 'Any'}`
                  : 'Price'}
              </button>
              {showPriceFilter && (
                <div className="absolute left-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Range (₦)</p>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-bata-primary focus:outline-none" />
                    <span className="text-gray-400 font-bold">—</span>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-bata-primary focus:outline-none" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { label: '<₦5k',    min: '',      max: '5000'  },
                      { label: '₦5k-20k', min: '5000',  max: '20000' },
                      { label: '₦20k-50k',min: '20000', max: '50000' },
                      { label: '>₦50k',   min: '50000', max: ''      },
                    ].map(p => (
                      <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max) }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-bata-primary/10 hover:text-bata-primary text-gray-600 text-[11px] font-semibold rounded-full transition-all">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={clearPrice} className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-xs font-bold">Clear</button>
                    <button onClick={applyPrice} className="flex-1 py-2 rounded-xl bg-bata-primary text-white text-xs font-bold shadow-md">Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative flex-shrink-0">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none bg-white border border-gray-200 rounded-full pl-7 pr-5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="recent">Newest</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
              </select>
            </div>

            {/* Clear all filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition px-2"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Results count */}
        {hasSearched && (
          <p className="text-sm text-gray-500 mb-5">
            {loading ? 'Searching...' : (
              <>
                <span className="font-black text-gray-900">{sortedProducts.length}</span> result{sortedProducts.length !== 1 ? 's' : ''}
                {appliedQuery && <span className="text-gray-400"> for "<span className="text-gray-700">{appliedQuery}</span>"</span>}
                {appliedCategory !== 'All' && <span className="text-bata-primary font-semibold"> in {appliedCategory}</span>}
                {appliedHostel && <span className="text-bata-primary font-semibold"> near {appliedHostel}</span>}
              </>
            )}
          </p>
        )}

        {/* States */}
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-bata-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-bata-primary" />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-1">What are you looking for?</h3>
            <p className="text-sm text-gray-400 max-w-xs">Try "iPhone 128GB", "Black XL hoodie", or "Used laptop"</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-1">No results found</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-5">
              Try different keywords{hasActiveFilters ? ' or clear some filters' : ''}.
            </p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-bata-primary text-sm font-bold underline mb-3">
                Clear all filters
              </button>
            )}
            <button onClick={() => router.push('/marketplace')} className="inline-flex items-center gap-2 bg-bata-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md">
              Browse Marketplace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.images[0] || '/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.hostelName && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      📍 {product.hostelName}
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-bata-primary transition-colors flex-1">
                    {product.name}
                  </h3>
                  <div className="mt-3 pt-2.5 border-t border-gray-50 space-y-1.5">
                    <p className="text-bata-primary font-black text-base tracking-tight">{formatPrice(product.price)}</p>
                    <div className="flex items-center justify-between">
                      <StarRating rating={product.seller.avgRating} />
                      <TrustPill level={product.seller.trustLevel} />
                    </div>
                    <Link
                      href={`/seller/${product.seller.id}`}
                      className="text-xs font-semibold text-gray-500 hover:text-bata-primary truncate block transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {product.seller.name}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  )
}