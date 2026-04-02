'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function RiderLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in as a rider, go straight to dashboard
  useEffect(() => {
    const role = localStorage.getItem('userRole')
    if (role === 'RIDER') {
      router.replace('/rider-dashboard')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/riders/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Store in localStorage (for client-side checks)
        localStorage.setItem('token',    data.token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId',   data.user.id)
        localStorage.setItem('userName', data.user.name)

        // ── IMPORTANT: also store in a cookie so middleware can read it ──
        // httpOnly is not set here because we're in client JS;
        // the middleware reads this cookie to enforce role-based routing.
        document.cookie = `token=${data.token}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`

        router.push('/rider-dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-BATAMART-primary to-BATAMART-secondary rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 6h-4l-2 5.5M9 17.5h5.5l2-5.5H19" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6l1.5 5.5" />
              </svg>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-BATAMART-primary to-BATAMART-secondary bg-clip-text text-transparent">
              BATAMART
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rider Login</h1>
          <p className="text-gray-600">Log in to see available deliveries</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none transition-colors"
                placeholder="you@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-BATAMART-primary focus:outline-none transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-BATAMART-primary hover:bg-BATAMART-dark text-white py-3.5 rounded-lg font-bold text-lg disabled:opacity-50 transition-all shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Logging in...
                </span>
              ) : (
                '🚴 Log In as Rider'
              )}
            </button>

          </form>

          {/* No signup link — riders are created by admin only */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Not a rider?{' '}
              <Link href="/login" className="text-gray-500 hover:underline">
                Regular login →
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-800 text-sm font-semibold">💰 Earn ₦560 per delivery</p>
          <p className="text-green-700 text-xs mt-1">Withdraw anytime to your bank account</p>
        </div>

      </div>
    </div>
  )
}

export default function RiderLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-BATAMART-primary border-t-transparent" />
      </div>
    }>
      <RiderLoginForm />
    </Suspense>
  )
}