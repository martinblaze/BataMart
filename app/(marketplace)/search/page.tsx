'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Filter, Loader2, Search, X } from 'lucide-react'
import { CATEGORY_TREE } from '@/lib/variants'

type Product = {
  id: string
  name: string
  price: number
  priceDisplay?: string
  images?: string[]
  isHot?: boolean
  isNew?: boolean
  isDeal?: boolean
  discountPercent?: number | null
  seller?: {
    name?: string
    trustLevel?: string
  }
}

type FilterDef = {
  key: string
  label: string
  type: string
  options: Array<{ value: string; count: number }>
}

const TOP_CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Phones' },
  { key: 'computing', label: 'Laptops' },
  { key: 'fashion', label: 'Clothes' },
  { key: 'groceries-food-fast-food', label: 'Food' },
  { key: 'home-kitchen', label: 'Room' },
]

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [availableFilters, setAvailableFilters] = useState<FilterDef[]>([])
  const [categoryKey, setCategoryKey] = useState('all')
  const [subcategoryKey, setSubcategoryKey] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [sortBy, setSortBy] = useState('relevance')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [inputQuery, setInputQuery] = useState(searchParams.get('q') || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [serverPriceBounds, setServerPriceBounds] = useState<{ min: number; max: number }>({ min: 0, max: 1000000 })

  const subcategories = useMemo(() => {
    if (!categoryKey || categoryKey === 'all') return []
    return Object.entries(CATEGORY_TREE[categoryKey]?.subcategories || {}).map(([key, sub]) => ({
      key,
      label: sub.label,
    }))
  }, [categoryKey])

  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputQuery.trim()), 400)
    return () => clearTimeout(t)
  }, [inputQuery])

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const params = new URLSearchParams()
        if (categoryKey !== 'all') params.append('categoryKey', categoryKey)
        if (subcategoryKey) params.append('subcategoryKey', subcategoryKey)
        const res = await fetch(`/api/product-filters?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setAvailableFilters(data.filters || [])
        if (data.price?.max) {
          const nextBounds = { min: Number(data.price.min || 0), max: Number(data.price.max || 1000000) }
          setServerPriceBounds(nextBounds)
          setPriceRange(([min, max]) => [Math.max(nextBounds.min, min), Math.min(nextBounds.max, max || nextBounds.max)])
        }
      } catch {}
    }
    fetchFilters()
  }, [categoryKey, subcategoryKey])

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }
        const params = new URLSearchParams()
        if (categoryKey !== 'all') params.append('categoryKey', categoryKey)
        if (subcategoryKey) params.append('subcategoryKey', subcategoryKey)
        if (searchQuery) params.append('q', searchQuery)
        params.append('minPrice', String(priceRange[0]))
        params.append('maxPrice', String(priceRange[1]))
        params.append('sortBy', sortBy)
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value)
        })
        const res = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setProducts(data.products || [])
      } catch {
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [categoryKey, subcategoryKey, serializedFilters, priceRange[0], priceRange[1], sortBy, searchQuery, router])

  const onCategoryChange = (next: string) => {
    setCategoryKey(next)
    setSubcategoryKey(null)
    setFilters({})
  }

  const clearFilters = () => {
    setFilters({})
    setSubcategoryKey(null)
    setPriceRange([serverPriceBounds.min, serverPriceBounds.max])
    setSortBy('relevance')
  }

  const filterPanel = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Subcategory</p>
        <select
          value={subcategoryKey || ''}
          onChange={(e) => setSubcategoryKey(e.target.value || null)}
          disabled={categoryKey === 'all'}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {subcategories.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Price Range</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={priceRange[0]}
            min={serverPriceBounds.min}
            onChange={(e) => setPriceRange(([_, max]) => [Number(e.target.value || 0), max])}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={priceRange[1]}
            min={serverPriceBounds.min}
            onChange={(e) => setPriceRange(([min]) => [min, Number(e.target.value || serverPriceBounds.max)])}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sort</p>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
          <option value="relevance">Most Relevant</option>
          <option value="newest">Newest</option>
          <option value="priceLow">Price: Low to High</option>
          <option value="priceHigh">Price: High to Low</option>
        </select>
      </div>

      {availableFilters.map((filter) => (
        <div key={filter.key}>
          <p className="text-sm font-bold text-gray-700 mb-2">{filter.label}</p>
          <div className="space-y-1.5">
            {filter.options.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={filters[filter.key] === option.value}
                  onChange={() =>
                    setFilters((prev) => ({
                      ...prev,
                      [filter.key]: prev[filter.key] === option.value ? '' : option.value,
                    }))
                  }
                />
                <span>{option.value} ({option.count})</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={clearFilters} className="w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700">
        Clear Filters
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f3f4f8]">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/marketplace')} className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Search products"
                className="w-full bg-transparent text-sm outline-none"
              />
              {inputQuery && (
                <button onClick={() => setInputQuery('')}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button onClick={() => setIsFilterOpen(true)} className="md:hidden h-9 rounded-xl border border-gray-200 px-3 text-sm font-semibold flex items-center gap-1">
              <Filter className="h-4 w-4" /> Filter
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {TOP_CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onCategoryChange(tab.key)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  categoryKey === tab.key ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:grid md:grid-cols-[260px_1fr] md:gap-4">
        <aside className="hidden md:block rounded-2xl border border-gray-200 bg-white p-4 h-fit sticky top-24">
          {filterPanel}
        </aside>

        <main>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-2 animate-pulse">
                  <div className="aspect-square rounded-xl bg-gray-100" />
                  <div className="mt-2 h-3 w-4/5 bg-gray-100 rounded" />
                  <div className="mt-2 h-3 w-2/5 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
              <p className="text-gray-600 font-semibold">No products found</p>
              <button onClick={clearFilters} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => router.push(`/product/${product.id}`)}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden text-left"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                    ) : null}
                    <div className="absolute left-2 top-2 flex gap-1">
                      {product.isHot && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">HOT</span>}
                      {product.isNew && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                      {product.isDeal && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">DEAL</span>}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-xs font-bold text-gray-900">{product.name}</p>
                    <p className="mt-1 text-sm font-black text-indigo-600">{product.priceDisplay || fmt(product.price)}</p>
                    {product.discountPercent ? (
                      <p className="text-[10px] font-semibold text-red-500">-{product.discountPercent}%</p>
                    ) : null}
                    <div className="mt-1 flex items-center justify-between">
                      <p className="truncate text-[10px] text-gray-400">{product.seller?.name || 'Seller'}</p>
                      {product.seller?.trustLevel ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{product.seller.trustLevel}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white p-4 overflow-y-auto">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Filters</h3>
              <button onClick={() => setIsFilterOpen(false)}><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            {filterPanel}
            <button onClick={() => setIsFilterOpen(false)} className="mt-4 w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white">
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f4f8] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
      <SearchPage />
    </Suspense>
  )
}

