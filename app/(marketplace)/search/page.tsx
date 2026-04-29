'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Filter, Star, ChevronLeft,
  SlidersHorizontal, Sparkles, TrendingUp,
  BadgeCheck, ShoppingBag, Loader2, ChevronDown,
} from 'lucide-react'
import { decodeProductData, CATEGORY_TREE, getCategoryList } from '@/lib/variants'

const SEARCH_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }

  .result-card {
    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.25s ease, border-color 0.2s ease;
  }
  .result-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.1);
    border-color: #e0e7ff;
  }
  .result-card:hover .product-img { transform: scale(1.06); }
  .product-img { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }

  .search-bar { transition: box-shadow 0.25s ease; }
  .search-bar:focus-within { box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }

  .chip-active {
    background: linear-gradient(135deg, #6366f1, #7c3aed) !important;
    color: white !important;
    border-color: transparent !important;
  }
`

const TRENDING_TAGS = ['iPhone', 'Sneakers', 'Laptop', 'Jollof Rice', 'Airpods', 'Power Bank', 'PlayStation']

function TrustPill({ level }: { level: string }) {
  const tone = level === 'GOLD'
    ? { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-400' }
    : level === 'SILVER'
      ? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' }
      : { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-400' }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />{level}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-2.5 h-2.5 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-[10px] font-semibold text-gray-500 ml-0.5">{rating.toFixed(1)}</span>
    </div>
  )
}

// Build full-text search blob from a product (name + category + subcategory + tags + variant values)
function buildSearchBlob(p: any): string {
  const { variants, tags } = decodeProductData(p.description || '')
  const variantValues = Object.values(variants).flat()
  const structuredVariantValues = Array.isArray(p.variants)
    ? p.variants.flatMap((v: any) => Object.values(v?.combination || {}))
    : []
  return [
    p.name,
    p.category,
    p.categoryKey ?? '',
    p.subcategory ?? '',
    p.subcategoryKey ?? '',
    ...tags,
    ...variantValues,
    ...structuredVariantValues,
  ].join(' ').toLowerCase()
}

function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [query, setQuery]           = useState(initialQ)
  const [inputVal, setInputVal]     = useState(initialQ)
  const [products, setProducts]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [sortBy, setSortBy]         = useState<'recent' | 'price-low' | 'price-high'>('recent')
  const [minPrice, setMinPrice]     = useState('')
  const [maxPrice, setMaxPrice]     = useState('')
  const [appliedMin, setAppliedMin] = useState<number | null>(null)
  const [appliedMax, setAppliedMax] = useState<number | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [categoryFilterDefs, setCategoryFilterDefs] = useState<Array<{ key: string; label: string; type: string; options: Array<{ value: string; count: number }> }>>([])
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 })

  // Dynamic attribute filters from API
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({})

  const queryTokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])

  useEffect(() => {
    if (document.getElementById('search-anim')) return
    const s = document.createElement('style'); s.id = 'search-anim'; s.textContent = SEARCH_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [query, appliedMin, appliedMax, filterCategory, filterSubcategory, JSON.stringify(attributeFilters)])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const qs = new URLSearchParams()
      if (query.trim()) qs.set('q', query.trim())
      if (filterCategory) qs.set('categoryKey', filterCategory)
      if (filterSubcategory) qs.set('subcategoryKey', filterSubcategory)
      if (appliedMin !== null) qs.set('minPrice', String(appliedMin))
      if (appliedMax !== null) qs.set('maxPrice', String(appliedMax))
      Object.entries(attributeFilters).forEach(([k, v]) => { if (v) qs.set(k, v) })
      const res  = await fetch(`/api/products?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setProducts(data.products || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    const loadCategoryFilters = async () => {
      if (!filterCategory) {
        setCategoryFilterDefs([])
        return
      }
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const qs = new URLSearchParams({ categoryKey: filterCategory })
        if (filterSubcategory) qs.set('subcategoryKey', filterSubcategory)
        const res = await fetch(`/api/product-filters?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) return
        setCategoryFilterDefs(data.filters || [])
        setPriceRange(data.price || { min: 0, max: 0 })
      } catch {}
    }
    loadCategoryFilters()
  }, [filterCategory, filterSubcategory])

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleSearch = () => {
    const q = inputVal.trim()
    if (!q) return
    setQuery(q)
    setAttributeFilters({})
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  const applyPrice = () => {
    setAppliedMin(minPrice ? parseFloat(minPrice) : null)
    setAppliedMax(maxPrice ? parseFloat(maxPrice) : null)
    setShowFilter(false)
  }

  const clearFilters = () => {
    setMinPrice(''); setMaxPrice(''); setAppliedMin(null); setAppliedMax(null)
    setFilterCategory(''); setFilterSubcategory(''); setAttributeFilters({}); setShowFilter(false)
  }

  // Run search + filters
  const filtered = useMemo(() => {
    const base = queryTokens.length
      ? products.filter((p) => {
          const blob = buildSearchBlob(p)
          return queryTokens.every((token) => blob.includes(token))
        })
      : products
    return base
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        return 0
      })
  }, [products, queryTokens, sortBy])

  const handleProductClick = (id: string) => {
    const token = localStorage.getItem('token')
    try {
      const viewed  = JSON.parse(localStorage.getItem('BATAMART-recently-viewed') || '[]')
      const product = products.find(p => p.id === id)
      if (product) {
        const updated = [product, ...viewed.filter((v: any) => v.id !== id)].slice(0, 20)
        localStorage.setItem('BATAMART-recently-viewed', JSON.stringify(updated))
      }
    } catch {}
    window.location.href = token ? `/product/${id}` : '/login'
  }

  const priceActive = appliedMin !== null || appliedMax !== null
  const catList = getCategoryList()
  const activeFilterCount = (priceActive ? 1 : 0) + (filterCategory ? 1 : 0) + (filterSubcategory ? 1 : 0) + Object.values(attributeFilters).filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-violet-900 to-purple-900 sticky top-0 z-40 shadow-xl">
        <div className="max-w-3xl mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            <button onClick={() => router.push('/marketplace')}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl shadow-md px-3 py-2.5 search-bar">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search products, variants, tags..."
                className="flex-1 bg-transparent text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none min-w-0"
                autoFocus
              />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setQuery(''); setAttributeFilters({}) }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showFilter ? 'bg-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <SlidersHorizontal className={`w-4 h-4 ${showFilter ? 'text-indigo-600' : 'text-white'}`} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6">

        {/* ── Filter Panel ── */}
        {showFilter && (
          <div className="fade-up bg-white rounded-2xl shadow-lg border border-gray-100 mt-3 p-4 space-y-4">
            {/* Category filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilterCategory('')}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${!filterCategory ? 'chip-active' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  All
                </button>
                {catList.map(c => (
                  <button key={c.key} onClick={() => { setFilterCategory(filterCategory === c.key ? '' : c.key); setFilterSubcategory(''); setAttributeFilters({}) }}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${filterCategory === c.key ? 'chip-active' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {filterCategory && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Subcategory</p>
                <select
                  value={filterSubcategory}
                  onChange={(e) => { setFilterSubcategory(e.target.value); setAttributeFilters({}) }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">All subcategories</option>
                  {Object.entries(CATEGORY_TREE[filterCategory]?.subcategories || {}).map(([key, sub]) => (
                    <option key={key} value={key}>{sub.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Price filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price Range (₦)</p>
              {priceRange.max > 0 && (
                <p className="text-[11px] text-gray-400 mb-1">Available: {fmt(priceRange.min)} - {fmt(priceRange.max)}</p>
              )}
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
                <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            {/* Smart variant filters from results */}
            {categoryFilterDefs.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Smart Filters</p>
                {categoryFilterDefs.slice(0, 8).map((def) => (
                  <div key={def.key}>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">{def.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {def.options.slice(0, 12).map((opt) => (
                        <button key={opt.value} onClick={() => setAttributeFilters(prev => ({ ...prev, [def.key]: prev[def.key] === opt.value ? '' : opt.value }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${attributeFilters[def.key] === opt.value ? 'bg-indigo-600 text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                          {opt.value} <span className="opacity-70">({opt.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={clearFilters} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                Clear All
              </button>
              <button onClick={applyPrice} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
                Apply
              </button>
            </div>
          </div>
        )}

        {/* ── Trending ── */}
        {!query && !loading && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Trending Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map(tag => (
                <button key={tag} onClick={() => { setInputVal(tag); setQuery(tag); router.replace(`/search?q=${encodeURIComponent(tag)}`, { scroll: false }) }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm">
                  🔍 {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Sort + Results Header ── */}
        {query && !loading && (
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-bold text-gray-600">
              {filtered.length === 0 ? 'No results' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              {query && <span className="text-gray-400"> for "<span className="text-indigo-600">{query}</span>"</span>}
            </p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
            >
              <option value="recent">Recent</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
            </select>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-400 font-semibold">Searching...</p>
          </div>
        )}

        {/* ── No Results ── */}
        {!loading && query && filtered.length === 0 && (
          <div className="fade-up text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-black text-gray-700 text-lg mb-1">Nothing found</h3>
            <p className="text-gray-400 text-sm mb-4">Try different keywords or clear filters</p>
            <button onClick={clearFilters} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Results Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {filtered.map((product, i) => {
              const { variants, tags } = decodeProductData(product.description || '')
              const variantChips = Object.entries(variants).flatMap(([, vals]) => vals as string[]).slice(0, 3)
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="result-card fade-up text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="product-img w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {product.category && (
                      <span className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-black text-gray-900 line-clamp-2 mb-1 leading-snug">{product.name}</p>

                    {/* Variant chips */}
                    {variantChips.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {variantChips.map(v => (
                          <span key={v} className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{v}</span>
                        ))}
                      </div>
                    )}

                    <p className="text-base font-black text-indigo-600 mb-1">{fmt(product.price)}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[70px]">{product.seller?.name}</span>
                      </div>
                      {product.seller?.avgRating > 0 && <StarRating rating={product.seller.avgRating} />}
                    </div>
                    {product.seller?.trustLevel && <TrustPill level={product.seller.trustLevel} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
      <SearchPage />
    </Suspense>
  )
}
