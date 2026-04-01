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

const HOSTELS = [
  'Aroma',
  'Tempsite',
  'Express Gate',
  'Ifite',
  'Amansea',
  'Bus Stand (Inside School)',
  'School Hostel (Inside School)',
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Before you list</h3>
        </div>

        {/* Fee Breakdown */}
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

        {/* Policy Warning */}
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

          {/* Checkbox */}
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
            className="flex-1 py-3 rounded-xl bg-BATAMART-primary text-white font-semibold text-sm hover:bg-BATAMART-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            List Product
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SellPage() {
  const router = useRouter()
  const [loading, setLoading]                   = useState(false)
  const [checkingAuth, setCheckingAuth]         = useState(true)
  const [error, setError]                       = useState('')
  const [images, setImages]                     = useState<{ preview: string; url: string; uploading: boolean }[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [tags, setTags]         = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const tagInputRef             = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name:       '',
    price:      '',
    quantity:   '1',
    category:   '',
    hostelName: '',
    roomNumber: '',
    landmark:   '',
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) router.push('/login')
    else setCheckingAuth(false)
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-BATAMART-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) { setTagInput(''); return }
    if (tags.length >= 20) { setError('Maximum 20 tags allowed'); return }
    setTags(prev => [...prev, trimmed])
    setTagInput('')
    setError('')
  }

  const removeTag = (index: number) => setTags(prev => prev.filter((_, i) => i !== index))

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
    else if (e.key === 'Backspace' && !tagInput && tags.length > 0) removeTag(tags.length - 1)
  }

  const suggestions = formData.category
    ? (TAG_SUGGESTIONS[formData.category] || []).filter(s => !tags.includes(s))
    : []

  const uploadToCloudinary = async (base64: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ image: base64 }),
      })
      const data = await response.json()
      if (!response.ok) return null
      return data.url
    } catch { return null }
  }

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_IMAGE_SIZE_MB   = 8

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining      = 3 - images.length
    const filesToProcess = Array.from(files).slice(0, remaining)
    for (const file of filesToProcess) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not allowed. Only JPG, PNG, and WEBP images are accepted.`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" is too large. Images must be under ${MAX_IMAGE_SIZE_MB}MB.`)
        continue
      }
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        setImages(prev => [...prev, { preview: base64, url: '', uploading: true }])
        const cloudUrl = await uploadToCloudinary(base64)
        if (cloudUrl) {
          setImages(prev => prev.map(img => img.preview === base64 ? { ...img, url: cloudUrl, uploading: false } : img))
        } else {
          setImages(prev => prev.filter(img => img.preview !== base64))
          setError('Failed to upload one of your images. Please try again.')
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index))
  const allUploaded = images.length > 0 && images.every(img => !img.uploading)

  // Validates then shows modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (images.length < 1) { setError('Please add at least 1 product image'); return }
    if (!allUploaded)      { setError('Please wait for all images to finish uploading'); return }
    if (tags.length === 0) { setError('Please add at least 1 description tag (e.g. New, 128GB, Black)'); return }
    setError('')
    setShowConfirmModal(true)
  }

  // Called when user clicks "List Product" in the modal
  const handleConfirmListing = async () => {
    setShowConfirmModal(false)
    setLoading(true)
    setError('')
    try {
      const token       = localStorage.getItem('token')
      const imageUrls   = images.map(img => img.url)
      const description = tags.join(' | ')

      const response = await fetch('/api/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ...formData,
          description,
          price:    parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          images:   imageUrls,
        }),
      })
      const data = await response.json()
      if (response.ok) router.push('/my-shop')
      else setError(data.error || 'Failed to create product')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmListingModal
          price={parseFloat(formData.price) || 0}
          onConfirm={handleConfirmListing}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('app') === 'true' ? '/marketplace?app=true' : '/marketplace'}
            className="text-BATAMART-primary hover:underline mb-4 inline-block"
          >
            ← Back to Marketplace
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Sell Your Product</h1>
          <p className="text-gray-600 mt-2">List your item on BATAMART marketplace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Product Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                placeholder="e.g., iPhone 13 Pro"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                required min="0" step="0.01"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                placeholder="e.g., 50000"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantity Available <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                required min="1"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">How many units do you have in stock?</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Description Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Product Details / Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Type a detail and press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[11px]">Enter</kbd> or click <strong>Add</strong> to add it as a tag.
              </p>
              <div
                className="min-h-[56px] w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus-within:border-BATAMART-primary transition-colors cursor-text flex flex-wrap gap-2 items-center"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-BATAMART-primary/10 text-BATAMART-primary text-sm font-semibold rounded-full">
                    {tag}
                    <button type="button" onClick={e => { e.stopPropagation(); removeTag(i) }} className="hover:text-red-500 transition-colors ml-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? 'e.g. New, 128GB, Black, XL...' : 'Add more...'}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 min-w-[100px]"
                  />
                  {tagInput.trim() && (
                    <button type="button" onClick={() => addTag(tagInput)} className="flex items-center gap-1 px-3 py-1 bg-BATAMART-primary text-white text-xs font-bold rounded-full hover:bg-BATAMART-dark transition-colors flex-shrink-0">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              </div>

              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 12).map(s => (
                      <button key={s} type="button" onClick={() => addTag(s)} className="px-3 py-1.5 bg-gray-100 hover:bg-BATAMART-primary/10 hover:text-BATAMART-primary text-gray-600 text-xs font-semibold rounded-full transition-all border border-gray-200 hover:border-BATAMART-primary/30">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tags.length > 0 && <p className="text-xs text-gray-400 mt-2">{tags.length} tag{tags.length !== 1 ? 's' : ''} added</p>}
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Images <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4">
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((img, index) => (
                      <div key={index} className="relative">
                        <img src={img.preview} alt={`Product ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
                          </div>
                        )}
                        {!img.uploading && img.url && (
                          <div className="absolute top-2 left-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {!img.uploading && (
                          <button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-sm font-bold">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {images.length < 3 && (
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} className="hidden" />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-BATAMART-primary transition-colors">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-gray-600 font-medium">Click to upload images</p>
                      <p className="text-sm text-gray-500 mt-1">{images.length}/3 images · JPG, PNG, WEBP · Max 8MB each</p>
                    </div>
                  </label>
                )}
                {images.some(img => img.uploading) && (
                  <p className="text-sm text-BATAMART-primary font-medium">⏳ Uploading images, please wait...</p>
                )}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Pickup Location</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hostel/Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.hostelName}
                    onChange={e => setFormData({ ...formData, hostelName: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                  >
                    <option value="">Select hostel</option>
                    {HOSTELS.map(hostel => <option key={hostel} value={hostel}>{hostel}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                    placeholder="e.g., Room 12, Block A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Landmark <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none"
                    placeholder="e.g., Near the water dispenser"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !allUploaded}
              className="w-full bg-BATAMART-primary hover:bg-BATAMART-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Listing Product...' : !allUploaded && images.length > 0 ? 'Uploading images...' : 'List Product'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}