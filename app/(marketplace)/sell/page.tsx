'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Plus, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  'Fashion & Clothing',
  'Food Services',
  'Room Essentials',
  'School Supplies',
  'Tech Gadgets',
  'Cosmetics',
  'Snacks',
  'Deodorants',
  'Books',
  'Furniture',
]

const TAG_SUGGESTIONS: Record<string, string[]> = {
  'Tech Gadgets': ['New', 'Used', 'Refurbished', '128GB', '256GB', '64GB', 'Black', 'White', 'Gold', 'Silver', 'Battery Health 90%', 'Battery Health 80%', 'iPhone 13', 'iPhone 14', 'Samsung', 'Unlocked', 'Charger Included', 'Original Box'],
  'Fashion & Clothing': ['New', 'Used', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Unisex', 'Male', 'Female'],
  'Food Services': ['Spicy', 'Mild', 'Vegetarian', 'Chicken', 'Beef', 'Fish', 'Rice', 'Pasta', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Homemade', 'Fresh Daily'],
  'Room Essentials': ['New', 'Used', 'Single', 'Double', 'Small', 'Medium', 'Large', 'Electric', 'Manual', 'Foldable'],
  'School Supplies': ['New', 'Used', '100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Engineering', 'Law', 'Medicine', 'Sciences', 'Arts'],
  'Cosmetics': ['For Men', 'For Women', 'Unisex', 'Natural', 'Organic', 'Original', 'New', 'Sealed'],
  'Snacks': ['Homemade', 'Packaged', 'Sweet', 'Savory', 'Spicy', 'Fresh', 'Vegan'],
  'Deodorants': ['For Men', 'For Women', 'Unisex', 'Roll-on', 'Spray', 'Original', 'New', 'Sealed'],
  'Books': ['New', 'Used', 'Good Condition', 'Fair Condition', 'Hardcover', 'Paperback', '100 Level', '200 Level', '300 Level', '400 Level'],
  'Furniture': ['New', 'Used', 'Good Condition', 'Foldable', 'Wooden', 'Plastic', 'Metal', 'Single', 'Double'],
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmListingModal({
  price,
  onConfirm,
  onCancel,
}: {
  price: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const [agreedToPolicy, setAgreedToPolicy] = useState(false)

  const platformFee = price * 0.05
  const youReceive  = price * 0.95

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Before you list</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          BATAMART charges a <strong>5% platform fee</strong> on every completed sale:
        </p>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Your listed price</span>
            <span className="font-semibold text-gray-900">{fmt(price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Platform fee (5%)</span>
            <span className="font-semibold text-red-500">− {fmt(platformFee)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-gray-700 font-semibold">You receive</span>
            <span className="font-bold text-green-600">{fmt(youReceive)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          💡 Want to receive <strong>{fmt(price)}</strong>? List at <strong>{fmt(Math.ceil(price / 0.95))}</strong> to cover the fee.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2 mb-3">
            <span className="text-lg">🚫</span>
            <div>
              <p className="text-sm font-bold text-red-700 mb-1">Product Availability Policy</p>
              <p className="text-xs text-red-600 leading-relaxed">
                The product you are listing <strong>must be physically with you right now.</strong> Listing items you plan to waybill, order, or source from elsewhere after someone buys is <strong>strictly prohibited</strong> and will result in an <strong>immediate penalty on your account</strong>, including possible suspension.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={e => setAgreedToPolicy(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-red-600 flex-shrink-0"
            />
            <span className="text-xs text-red-700 font-semibold leading-relaxed">
              I confirm that this product is currently in my possession and ready for pickup. I understand that violating this policy will result in a penalty on my BATAMART account.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={!agreedToPolicy}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            List Product
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SellPage() {
  const router = useRouter()

  // ── University-scoped location data (loaded from session) ─────────────────
  // These replace the old hardcoded HOSTELS and delivery areas arrays.
  // They come from user.university.hostels and user.university.deliveryAreas
  // which are already returned by /api/auth/me and stored in localStorage.
  const [campusHostels, setCampusHostels]         = useState<string[]>([])
  const [campusDeliveryAreas, setCampusDeliveryAreas] = useState<string[]>([])
  const [universityName, setUniversityName]       = useState('')
  const [locationReady, setLocationReady]         = useState(false)

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]         = useState('')
  const [category, setCategory]   = useState(CATEGORIES[0])
  const [quantity, setQuantity]   = useState('1')
  const [hostelName, setHostelName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [landmark, setLandmark]   = useState('')
  const [images, setImages]       = useState<string[]>([])
  const [tags, setTags]           = useState<string[]>([])
  const [tagInput, setTagInput]   = useState('')

  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const tagInputRef  = useRef<HTMLInputElement>(null)

  // ── Load university-specific location data from session ───────────────────
  // Strategy: first try localStorage (fast, avoids extra fetch), then fall
  // back to a fresh /api/auth/me call if the data isn't cached yet.
  useEffect(() => {
    const loadUniversityLocations = async () => {
      try {
        // Try from cached user in localStorage first
        const cached = localStorage.getItem('user')
        if (cached) {
          const u = JSON.parse(cached)
          if (u?.university?.hostels?.length || u?.university?.deliveryAreas?.length) {
            applyUniversityData(u.university)
            return
          }
        }

        // Fall back to fresh API call
        const token = localStorage.getItem('token')
        if (!token) { router.push('/login'); return }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { router.push('/login'); return }

        const data = await res.json()
        if (data.user?.university) {
          applyUniversityData(data.user.university)
        }
      } catch {
        // If all else fails, leave arrays empty — UI shows a warning
      } finally {
        setLocationReady(true)
      }
    }

    loadUniversityLocations()
  }, [router])

  function applyUniversityData(university: {
    name?: string
    hostels?: string[] | unknown
    deliveryAreas?: string[] | unknown
  }) {
    setUniversityName(university.name ?? '')

    // hostels and deliveryAreas are stored as Json in Prisma — they come back
    // as arrays from the API but may occasionally be stringified JSON
    const parseJsonArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
      if (typeof val === 'string') {
        try { return JSON.parse(val) } catch { return [] }
      }
      return []
    }

    const hostels       = parseJsonArray(university.hostels)
    const deliveryAreas = parseJsonArray(university.deliveryAreas)

    setCampusHostels(hostels)
    setCampusDeliveryAreas(deliveryAreas)

    // Pre-select the first option so the form is never in an empty state
    if (hostels.length > 0)       setHostelName(hostels[0])
    if (deliveryAreas.length > 0) setLandmark(deliveryAreas[0])
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    setUploading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const uploaded: string[] = []

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setError('Each image must be under 5MB')
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        })

        if (res.ok) {
          const data = await res.json()
          if (data.url) uploaded.push(data.url)
        }
      }

      setImages(prev => [...prev, ...uploaded])
    } catch {
      setError('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Tag handling ──────────────────────────────────────────────────────────
  const addTag = (tag: string) => {
    const t = tag.trim()
    if (!t || tags.includes(t) || tags.length >= 10) return
    setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim())        { setError('Product name is required'); return }
    if (!description.trim()) { setError('Description is required'); return }
    if (!price || parseFloat(price) < 100) { setError('Price must be at least ₦100'); return }
    if (!hostelName)         { setError('Please select your location'); return }
    if (!landmark)           { setError('Please select a delivery area'); return }
    if (images.length === 0) { setError('At least one image is required'); return }

    setShowConfirmModal(true)
  }

  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false)
    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/products', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:        name.trim(),
          description: description.trim(),
          price:       parseFloat(price),
          category,
          quantity:    parseInt(quantity) || 1,
          hostelName,
          roomNumber:  roomNumber.trim() || 'N/A',
          landmark,
          images,
          tags,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/my-shop?listed=1')
      } else {
        setError(data.error || 'Failed to list product. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  const suggestedTags = TAG_SUGGESTIONS[category] ?? []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {showConfirmModal && (
        <ConfirmListingModal
          price={parseFloat(price) || 0}
          onConfirm={handleConfirmedSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">List a Product</h1>
          {universityName && (
            <p className="text-xs text-gray-500">{universityName}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Images */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Product Images <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-400">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-400 mt-2">Up to 5 images, max 5MB each</p>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Product Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. iPhone 13 Pro Max 128GB"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your product in detail — condition, features, why you're selling..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{description.length}/1000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                min="100"
                step="50"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                max="999"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location — dynamic from university ─────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Your Location</h2>
            {universityName && (
              <p className="text-xs text-gray-400 mt-0.5">
                Showing locations for {universityName}
              </p>
            )}
          </div>

          {/* If location data hasn't loaded yet, show a skeleton */}
          {!locationReady ? (
            <div className="space-y-3">
              <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            </div>
          ) : (
            <>
              {/* Hostel / Lodge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hostel / Lodge <span className="text-red-500">*</span>
                </label>
                {campusHostels.length > 0 ? (
                  <select
                    value={hostelName}
                    onChange={e => setHostelName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                  >
                    <option value="">Select hostel / lodge</option>
                    {campusHostels.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                ) : (
                  // Fallback free-text if university has no hostels configured
                  <input
                    type="text"
                    value={hostelName}
                    onChange={e => setHostelName(e.target.value)}
                    placeholder="e.g. Python Hall, Block C"
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                )}
              </div>

              {/* Room Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 204, Ground Floor"
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              {/* Delivery Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Area <span className="text-red-500">*</span>
                </label>
                {campusDeliveryAreas.length > 0 ? (
                  <select
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                  >
                    <option value="">Select delivery area</option>
                    {campusDeliveryAreas.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                    placeholder="e.g. Aroma, Ifite"
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Where the buyer's rider should come to pick up this product
                </p>
              </div>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div>
            <h2 className="font-semibold text-gray-900">Tags</h2>
            <p className="text-xs text-gray-400 mt-0.5">Help buyers find your product faster (max 10)</p>
          </div>

          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 min-h-[50px]" onClick={() => tagInputRef.current?.focus()}>
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {tags.length < 10 && (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type a tag and press Enter' : ''}
                className="flex-1 min-w-[120px] outline-none text-sm text-gray-700 bg-transparent"
              />
            )}
          </div>

          {suggestedTags.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.filter(t => !tags.includes(t)).slice(0, 12).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="px-3 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors text-base"
        >
          {submitting ? 'Listing...' : 'Preview & List'}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          By listing, you agree to our{' '}
          <Link href="/terms/sellers" className="text-red-500 underline">Seller Terms</Link>
        </p>
      </form>
    </div>
  )
}