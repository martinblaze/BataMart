'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Filter, Star, ArrowRight, ChevronLeft,
  SlidersHorizontal, ChevronRight, Sparkles, TrendingUp,
  BadgeCheck, Truck, ShoppingBag, Loader2, ChevronDown,
} from 'lucide-react'

const SEARCH_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }

  @keyframes shimmerAnim {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
    background-size: 1200px 100%;
    animation: shimmerAnim 1.5s ease-in-out infinite;
  }

  .result-card {
    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.25s ease, border-color 0.2s ease;
  }
  .result-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.1);
    border-color: #e0e7ff;
  }
  .result-card:active { transform: scale(0.98); }
  .result-card:hover .product-img { transform: scale(1.06); }

  .product-img { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }

  .filter-panel {
    animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) forwards;
  }

  .sort-select {
    -webkit-appearance: none;
    appearance: none;
  }

  .search-bar {
    transition: box-shadow 0.25s ease, background 0.25s ease;
  }
  .search-bar:focus-within {
    box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
    background: white !important;
  }

  .chip-active {
    background: linear-gradient(135deg, #6366f1, #7c3aed) !important;
    color: white !important;
    border-color: transparent !important;
  }
`

const TRENDING_TAGS = ['iPhone', 'Sneakers', 'Laptop', 'Jollof Rice', 'Textbooks', 'Earbuds', 'Power Bank']

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

  const queryTokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])

  useEffect(() => {
    if (document.getElementById('search-anim')) return
    const s = document.createElement('style'); s.id = 'search-anim'; s.textContent = SEARCH_CSS
    document.head.appendChild(s)
  }, [])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }
      const res  = await fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setProducts(data.products || [])
    } catch {}
    finally { setLoading(false) }
  }

  const fmt = (p: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p)

  const handleSearch = () => {
    const q = inputVal.trim()
    if (!q) return
    setQuery(q)
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false })
  }

  const removeToken = (token: string) => {
    const newQ = queryTokens.filter(t => t !== token).join(' ')
    setQuery(newQ); setInputVal(newQ)
    router.replace(`/search?q=${encodeURIComponent(newQ)}`, { scroll: false })
  }

  const applyPrice = () => {
    setAppliedMin(minPrice ? parseFloat(minPrice) : null)
    setAppliedMax(maxPrice ? parseFloat(maxPrice) : null)
    setShowFilter(false)
  }

  const clearPrice = () => {
    setMinPrice(''); setMaxPrice(''); setAppliedMin(null); setAppliedMax(null); setShowFilter(false)
  }

  const filtered = useMemo(() => {
    if (!queryTokens.length) return []
    return products
      .filter(p => {
        const tags = parseTags(p.description)
        const allText = [p.name.toLowerCase(), p.category.toLowerCase(), ...tags.map((t: string) => t.toLowerCase())]
        const matches = queryTokens.every(token => allText.some(t => t.includes(token)))
        const priceOk = (appliedMin === null || p.price >= appliedMin) && (appliedMax === null || p.price <= appliedMax)
        return matches && priceOk
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        return 0
      })
  }, [products, queryTokens, sortBy, appliedMin, appliedMax])

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

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-950 via-violet-900 to-purple-900 sticky top-0 z-40 shadow-xl">
        <div className="max-w-3xl mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            <button
              onClick={() => router.push('/marketplace')}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl shadow-md px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search products, sellers, categories..."
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 font-medium"
                autoFocus
              />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setQuery('') }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="flex-shrink-0 px-4 py-2.5 text-white rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
            >
              Go
            </button>
          </div>

          {/* Trending pills */}
          {!query.trim() && (
            <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
              <span className="text-white/50 text-[10px] font-black uppercase tracking-wider flex-shrink-0">🔥 Try:</span>
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setInputVal(tag); setQuery(tag); router.replace(`/search?q=${encodeURIComponent(tag)}`); }}
                  className="flex-shrink-0 px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-[11px] font-bold whitespace-nowrap transition-all hover:scale-105"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4">

        {/* ── Active filter chips ── */}
        {(queryTokens.length > 0 || priceActive) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Active:</span>
            {queryTokens.map(token => (
              <span key={token} className="inline-flex items-center gap-1 px-2.5 py-1 text-white text-xs font-bold rounded-full"
                style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                {token}
                <button onClick={() => removeToken(token)}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {priceActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 text-white text-xs font-bold rounded-full">
                {appliedMin ? fmt(appliedMin) : '₦0'} – {appliedMax ? fmt(appliedMax) : 'Any'}
                <button onClick={clearPrice}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-xs text-gray-500 min-w-0 truncate">
            {loading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> Searching…</span>
            ) : (
              <>
                <span className="font-black text-gray-900">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
                {query && <span className="text-gray-400"> for "<span className="text-indigo-600 font-semibold">{query}</span>"</span>}
              </>
            )}
          </p>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Price filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilter(p => !p)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${priceActive
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
                }`}
                style={priceActive ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)' } : {}}
              >
                <Filter className="w-3 h-3" /> Price
              </button>
              {showFilter && (
                <div className="filter-panel absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Price Range (₦)</p>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min"
                      className="w-full px-2.5 py-2 border-2 border-gray-100 rounded-xl text-xs focus:border-indigo-400 focus:outline-none font-medium" />
                    <span className="text-gray-300 font-bold text-xs">—</span>
                    <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max"
                      className="w-full px-2.5 py-2 border-2 border-gray-100 rounded-xl text-xs focus:border-indigo-400 focus:outline-none font-medium" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[{ label: '<₦5k', min: '', max: '5000' }, { label: '₦5k-20k', min: '5000', max: '20000' }, { label: '₦20k-50k', min: '20000', max: '50000' }, { label: '>₦50k', min: '50000', max: '' }].map(p => (
                      <button key={p.label} onClick={() => { setMinPrice(p.min); setMaxPrice(p.max) }}
                        className="px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 text-[10px] font-bold rounded-full transition-all border border-gray-100">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={clearPrice} className="flex-1 py-2 rounded-xl border-2 border-gray-100 text-gray-600 text-xs font-bold">Clear</button>
                    <button onClick={applyPrice} className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="sort-select bg-white border border-gray-200 rounded-xl pl-7 pr-6 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-300 cursor-pointer"
              >
                <option value="recent">Newest</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="aspect-square shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-2.5 shimmer rounded-full w-1/2" />
                  <div className="h-3.5 shimmer rounded-full w-full" />
                  <div className="h-3.5 shimmer rounded-full w-3/4" />
                  <div className="h-5 shimmer rounded-full w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : !query.trim() ? (
          /* ── Empty state ── */
          <div className="fade-up flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4c1d95)' }}>
              <Search className="w-9 h-9 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Search BataMart</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">Try "iPhone 128GB", "Black hoodie M", or "Used laptop 300 level"</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TRENDING_TAGS.map(tag => (
                <button key={tag} onClick={() => { setInputVal(tag); setQuery(tag); router.replace(`/search?q=${encodeURIComponent(tag)}`); }}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-full hover:border-indigo-300 hover:text-indigo-600 transition-all hover:scale-105">
                  🔥 {tag}
                </button>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* ── No results ── */
          <div className="fade-up flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
              <Search className="w-9 h-9 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">No results found</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">No products match "<span className="font-bold text-gray-600">{query}</span>". Try fewer or different keywords.</p>
            <button onClick={() => router.push('/marketplace')}
              className="inline-flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-lg transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4c1d95)' }}>
              Browse Marketplace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── Product grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((product, i) => {
              const tags = parseTags(product.description)
              const matchedTags = tags.filter((t: string) => queryTokens.some(q => t.toLowerCase().includes(q)))
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="result-card fade-up group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={product.images[0] || '/placeholder.png'}
                      alt={product.name}
                      className="product-img w-full h-full object-cover"
                    />
                    {product.quantity === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-800 text-[11px] font-black px-3 py-1 rounded-full">OUT OF STOCK</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3 flex flex-col flex-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{product.category}</p>
                    <h3 className="font-black text-gray-900 line-clamp-2 text-xs sm:text-sm leading-snug group-hover:text-indigo-600 transition-colors flex-1">
                      {product.name}
                    </h3>
                    {matchedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {matchedTags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-50 space-y-1.5">
                      <p className="font-black text-sm tracking-tight text-indigo-600">{fmt(product.price)}</p>
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <StarRating rating={product.seller.avgRating} />
                        <TrustPill level={product.seller.trustLevel} />
                      </div>
                      <div className="flex items-center gap-1">
                        <BadgeCheck className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                        <Link
                          href={`/seller/${product.seller.id}`}
                          className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 truncate transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          {product.seller.name}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Floating search tip ── */}
      {filtered.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2 z-30">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-bold text-gray-600">{filtered.length} items found</span>
        </div>
      )}
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