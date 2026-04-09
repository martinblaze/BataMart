'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X, Plus, AlertCircle, Camera, Upload, CheckCircle2,
  Sparkles, Tag, MapPin, Package, ChevronRight, Zap,
  Shield, Info, ArrowLeft, Loader2, Image as ImageIcon, ChevronDown,
} from 'lucide-react'
import {
  CATEGORY_TREE, getCategoryList, getSubcategoryList,
  getVariantFields, encodeProductData, VariantField,
} from '@/lib/variants'

// ── CSS ──────────────────────────────────────────────────────────────────────
const SELL_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  .scale-in { animation: scaleIn 0.3s cubic-bezier(0.34,1.4,0.64,1) forwards; }

  .step-card {
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .step-card:focus-within {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .tag-pill {
    transition: transform 0.15s cubic-bezier(0.34,1.4,0.64,1), background 0.15s ease;
  }
  .tag-pill:hover { transform: scale(1.05); }

  .img-slot {
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s cubic-bezier(0.34,1.4,0.64,1);
  }
  .img-slot:hover { border-color: #6366f1; background: #f5f3ff; transform: scale(1.02); }

  .chip {
    transition: all 0.15s cubic-bezier(0.34,1.4,0.64,1);
  }
  .chip:hover {
    background: #6366f1;
    color: white;
    border-color: transparent;
    transform: scale(1.04) translateY(-1px);
  }
  .chip-active {
    background: #6366f1 !important;
    color: white !important;
    border-color: transparent !important;
  }

  .submit-btn {
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease;
    background: linear-gradient(135deg, #6366f1 0%, #4c1d95 100%);
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px rgba(99,102,241,0.4);
  }

  .cat-card {
    transition: all 0.15s cubic-bezier(0.34,1.4,0.64,1);
    cursor: pointer;
  }
  .cat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.12); }
  .cat-card-active {
    border-color: #6366f1 !important;
    background: linear-gradient(135deg, #f0f0ff, #ede9fe) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
  }

  .header-gradient {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  }
`

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmListingModal({ price, onConfirm, onCancel }: { price: number; onConfirm: () => void; onCancel: () => void }) {
  const [agreed, setAgreed] = useState(false)
  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
  const fee = price * 0.05
  const receive = price * 0.95

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="scale-in relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">Before you list</h3>
            <p className="text-xs text-gray-400">Review fees and confirm availability</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4 mb-4 border border-indigo-100">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Fee Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Your listed price</span>
              <span className="font-bold text-gray-900">{fmt(price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Platform fee (5%)</span>
              <span className="font-bold text-red-500">− {fmt(fee)}</span>
            </div>
            <div className="border-t border-indigo-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-800">You receive</span>
              <span className="font-black text-emerald-600 text-base">{fmt(receive)}</span>
            </div>
          </div>
          <p className="text-[11px] text-indigo-500 mt-3 bg-white/60 rounded-xl p-2.5 leading-relaxed">
            💡 To receive exactly <strong>{fmt(price)}</strong>, list at <strong>{fmt(Math.ceil(price / 0.95))}</strong>
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-2.5 mb-3">
            <span className="text-xl flex-shrink-0">🚫</span>
            <div>
              <p className="text-sm font-black text-red-700 mb-1">Product Availability Policy</p>
              <p className="text-xs text-red-600 leading-relaxed">
                The product <strong>must be physically with you right now.</strong> Listing items you plan to source after sale is <strong>strictly prohibited.</strong>
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded-lg flex-shrink-0 mt-0.5 cursor-pointer border-2 flex items-center justify-center transition-all ${agreed ? 'bg-red-500 border-red-500' : 'border-red-300 bg-white'}`}
            >
              {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-xs text-red-700 leading-relaxed">
              I confirm this product is physically available with me right now and I am ready to fulfil orders immediately.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
            Edit Listing
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreed}
            className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: agreed ? 'linear-gradient(135deg,#6366f1,#4c1d95)' : '#9ca3af' }}
          >
            List Product 🚀
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Variant Field Row ─────────────────────────────────────────────────────────
function VariantRow({
  field,
  values,
  onChange,
}: {
  field: VariantField
  values: string[]
  onChange: (vals: string[]) => void
}) {
  const [customInput, setCustomInput] = useState('')

  const addValue = (v: string) => {
    const trimmed = v.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
  }

  const removeValue = (v: string) => onChange(values.filter(x => x !== v))

  const handleCustomAdd = () => {
    addValue(customInput)
    setCustomInput('')
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
      <p className="text-sm font-bold text-gray-700 mb-3">{field.label}</p>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {field.suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => values.includes(s) ? removeValue(s) : addValue(s)}
            className={`chip text-xs px-3 py-1.5 rounded-xl border font-semibold ${
              values.includes(s)
                ? 'bg-indigo-600 text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {values.includes(s) ? '✓ ' : '+ '}{s}
          </button>
        ))}
      </div>

      {/* Selected values pills */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => removeValue(v)} className="hover:text-indigo-900 transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCustomAdd() } }}
          placeholder={`Add custom ${field.label.toLowerCase()}...`}
          className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={handleCustomAdd}
          disabled={!customInput.trim()}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Sell Page ────────────────────────────────────────────────────────────
export default function SellPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Basic info
  const [name, setName]         = useState('')
  const [price, setPrice]       = useState('')
  const [quantity, setQuantity] = useState('1')
  const [images, setImages]     = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Category system
  const [categoryKey, setCategoryKey]       = useState('')
  const [subcategoryKey, setSubcategoryKey] = useState('')

  // Variants: Record<variantKey, string[]>
  const [variantValues, setVariantValues] = useState<Record<string, string[]>>({})

  // Tags
  const [tags, setTags]         = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Location
  const [hostelName, setHostelName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [landmark, setLandmark]     = useState('')

  // UI
  const [submitting, setSubmitting]         = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [success, setSuccess]               = useState(false)
  const [error, setError]                   = useState('')

  const categories  = getCategoryList()
  const subcategories = categoryKey ? getSubcategoryList(categoryKey) : []
  const variantFields = (categoryKey && subcategoryKey) ? getVariantFields(categoryKey, subcategoryKey) : []

  // Reset subcategory + variants when category changes
  useEffect(() => {
    setSubcategoryKey('')
    setVariantValues({})
  }, [categoryKey])

  // Reset variants when subcategory changes (keep any matching keys)
  useEffect(() => {
    setVariantValues({})
  }, [subcategoryKey])

  // Auto-generate tags from name + variant values
  useEffect(() => {
    const catLabel = categoryKey ? CATEGORY_TREE[categoryKey]?.label : ''
    const subLabel = subcategoryKey ? CATEGORY_TREE[categoryKey]?.subcategories[subcategoryKey]?.label : ''
    const variantTags = Object.values(variantValues).flat()
    const nameParts = name.trim().split(/\s+/).filter(w => w.length > 2)
    const generated = [...new Set([...nameParts, catLabel, subLabel, ...variantTags].filter(Boolean))]
    setTags(prev => {
      // Merge: keep manual tags that aren't replaced, add generated
      const manual = prev.filter(t => !generated.includes(t))
      return [...generated, ...manual].slice(0, 30)
    })
  }, [name, categoryKey, subcategoryKey, variantValues])

  useEffect(() => {
    if (document.getElementById('sell-anim')) return
    const s = document.createElement('style'); s.id = 'sell-anim'; s.textContent = SELL_CSS
    document.head.appendChild(s)
  }, [])

  // Load user profile location
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setHostelName(d.user.hostelName || '')
          setRoomNumber(d.user.roomNumber || '')
          setLandmark(d.user.landmark || '')
        }
      })
      .catch(() => {})
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (images.length + files.length > 3) { setError('Maximum 3 images allowed'); return }
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const uploaded: string[] = []
      for (const file of files.slice(0, 3 - images.length)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
        const data = await res.json()
        if (data.url) uploaded.push(data.url)
      }
      setImages(prev => [...prev, ...uploaded].slice(0, 3))
    } catch { setError('Image upload failed') }
    finally { setUploading(false) }
  }

  const addTag = (t: string) => {
    const trimmed = t.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= 30) return
    setTags(prev => [...prev, trimmed])
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    }
  }

  const setVariantField = (key: string, vals: string[]) => {
    setVariantValues(prev => ({ ...prev, [key]: vals }))
  }

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Product name is required'); return }
    if (!price || parseFloat(price) <= 0) { setError('Enter a valid price'); return }
    if (!categoryKey) { setError('Select a category'); return }
    if (!subcategoryKey) { setError('Select a subcategory'); return }
    if (images.length === 0) { setError('Add at least one image'); return }
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const catLabel = CATEGORY_TREE[categoryKey]?.label ?? categoryKey
      const subLabel = CATEGORY_TREE[categoryKey]?.subcategories[subcategoryKey]?.label ?? subcategoryKey

      // Encode variant + tag data into description
      const description = encodeProductData(variantValues, tags)

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          description,
          price: parseFloat(price),
          category: catLabel,
          subcategory: subLabel,
          quantity: parseInt(quantity) || 1,
          images,
          hostelName,
          roomNumber,
          landmark,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to list product'); return }
      setSuccess(true)
      setTimeout(() => router.push('/my-shop'), 2000)
    } catch { setError('Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
  const priceNum = parseFloat(price) || 0
  const catIcon = categoryKey ? CATEGORY_TREE[categoryKey]?.icon : ''

  if (success) return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4">
      <div className="fade-up text-center bg-white rounded-3xl p-12 shadow-sm border border-gray-100 max-w-sm w-full">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Listed! 🎉</h2>
        <p className="text-gray-400 text-sm">Your product is now live. Redirecting to your shop...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-24">
      {showConfirm && <ConfirmListingModal price={priceNum} onConfirm={confirmSubmit} onCancel={() => setShowConfirm(false)} />}

      {/* Header */}
      <header className="header-gradient sticky top-0 z-30 shadow-xl">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-white">List a Product</h1>
            <p className="text-white/50 text-xs">Fill in product details below</p>
          </div>
          {catIcon && <span className="text-2xl">{catIcon}</span>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* Error */}
        {error && (
          <div className="fade-up flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-semibold">{error}</p>
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* ── STEP 1: Product Info ── */}
        <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</span>
            <h2 className="font-black text-gray-900">Basic Info</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. "iPhone 13 Pro Max 256GB"'
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Price (₦) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                {priceNum > 0 && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">You receive: {fmt(priceNum * 0.95)}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Stock Qty *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 2: Category ── */}
        <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">2</span>
            <h2 className="font-black text-gray-900">Category *</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryKey(cat.key)}
                className={`cat-card text-left p-3 rounded-xl border-2 ${
                  categoryKey === cat.key ? 'cat-card-active' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'
                }`}
              >
                <div className="text-xl mb-1">{cat.icon}</div>
                <p className="text-xs font-bold text-gray-700 leading-tight">{cat.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── STEP 3: Subcategory ── */}
        {categoryKey && (
          <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">3</span>
              <h2 className="font-black text-gray-900">Subcategory *</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subcategories.map(sub => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setSubcategoryKey(sub.key)}
                  className={`cat-card text-left px-3 py-2.5 rounded-xl border-2 text-xs font-bold ${
                    subcategoryKey === sub.key
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-indigo-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Variants ── */}
        {variantFields.length > 0 && (
          <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">4</span>
              <h2 className="font-black text-gray-900">Product Variants</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-8">Tap chips to add options, or type custom values</p>

            <div className="space-y-4">
              {variantFields.map(field => (
                <VariantRow
                  key={field.key}
                  field={field}
                  values={variantValues[field.key] ?? []}
                  onChange={vals => setVariantField(field.key, vals)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Images ── */}
        <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
              {variantFields.length > 0 ? '5' : '4'}
            </span>
            <h2 className="font-black text-gray-900">Photos (max 3) *</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-indigo-200 relative">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">MAIN</span>
                )}
              </div>
            ))}
            {images.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="img-slot aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-indigo-400"
              >
                {uploading ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : (
                  <>
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-bold">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        </div>

        {/* ── STEP 6: Tags ── */}
        <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
              {variantFields.length > 0 ? '6' : '5'}
            </span>
            <h2 className="font-black text-gray-900">Tags</h2>
          </div>
          <p className="text-xs text-gray-400 mb-3 ml-8">Auto-generated from your product. Add more or remove.</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => (
              <span key={tag} className="tag-pill inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Tag className="w-2.5 h-2.5" />
                {tag}
                <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                  <X className="w-3 h-3 ml-0.5 hover:text-indigo-900" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagInput}
              placeholder="Type tag, press Enter..."
              className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => { addTag(tagInput); setTagInput('') }}
              disabled={!tagInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── STEP 7: Location ── */}
        <div className="step-card fade-up bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
              {variantFields.length > 0 ? '7' : '6'}
            </span>
            <div>
              <h2 className="font-black text-gray-900">Pickup Location</h2>
              <p className="text-xs text-gray-400">Pre-filled from your profile</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Hostel / Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={hostelName}
                  onChange={e => setHostelName(e.target.value)}
                  placeholder="e.g. Block C Hall, Amina Hall"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Room Number</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 204B"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Near library..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="submit-btn w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Listing Product...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> List Product</>
          )}
        </button>

        {/* Trust info */}
        <div className="grid grid-cols-3 gap-3 pb-4">
          {[
            { icon: <Shield className="w-4 h-4 text-emerald-600" />, label: 'Secure Escrow', bg: 'bg-emerald-50' },
            { icon: <Zap className="w-4 h-4 text-amber-600" />, label: 'Fast Payout', bg: 'bg-amber-50' },
            { icon: <Package className="w-4 h-4 text-indigo-600" />, label: '5% Platform Fee', bg: 'bg-indigo-50' },
          ].map((item, i) => (
            <div key={i} className={`${item.bg} rounded-2xl p-3 text-center`}>
              <div className="flex justify-center mb-1">{item.icon}</div>
              <p className="text-[10px] font-bold text-gray-600">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}