'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, ChevronRight } from 'lucide-react'

interface University {
  id:    string
  name:  string
  shortName: string
  slug:  string
  location: string
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Step 0 = university select, then steps 1–4 as before ──────────────────
  const [step, setStep]           = useState(0)
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [uniLoading, setUniLoading] = useState(true)

  const [email, setEmail]         = useState('')
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [otpSessionToken, setOtpSessionToken] = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [wantToSell, setWantToSell] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.trim().toUpperCase())
  }, [searchParams])

  // ── Fetch universities on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/universities')
      .then(r => r.json())
      .then(data => {
        setUniversities(data.universities ?? [])
      })
      .catch(() => {})
      .finally(() => setUniLoading(false))
  }, [])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (!/\d/.test(pwd)) return 'Password must contain at least one number'
    return ''
  }

  const validatePhone = (ph: string) => {
    const digits = ph.replace(/\D/g, '')
    if (digits.length < 10) return 'Enter a valid phone number'
    if (digits.length > 15) return 'Enter a valid phone number'
    return ''
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const phoneError = validatePhone(phone)
    if (phoneError) { setError(phoneError); return }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        setStep(2)
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) { setError('Please enter the complete 6-digit code'); return }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otpCode: code }),
      })
      const data = await response.json()
      if (response.ok && data.otpSessionToken) {
        setOtpSessionToken(data.otpSessionToken)
        setStep(3)
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) { setError('Please agree to the Terms of Service'); return }
    const pwdError = validatePassword(password)
    if (pwdError) { setError(pwdError); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/signup-with-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone,
          password,
          otpSessionToken,
          role:         wantToSell ? 'SELLER' : 'BUYER',
          referralCode: referralCode || undefined,
          universityId: selectedUniversity!.id,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('token',    data.token)
        localStorage.setItem('userName', data.user.name)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId',   data.user.id)
        router.push('/marketplace')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ════════════════════════════════════════════════════════
  // STEP 0 — University selector
  // ════════════════════════════════════════════════════════
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white tracking-tight">BATAMART</h1>
            <p className="text-blue-300 text-sm mt-1">Campus Marketplace</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)' }}>
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Select Your Campus</h2>
              <p className="text-sm text-gray-500 mt-1">
                You'll only see buyers, sellers, and riders from your campus.
              </p>
            </div>

            {uniLoading ? (
              <div className="flex justify-center py-8">
                <svg className="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : (
              <div className="space-y-3">
                {universities.map(uni => (
                  <button
                    key={uni.id}
                    onClick={() => setSelectedUniversity(uni)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      selectedUniversity?.id === uni.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{uni.shortName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{uni.name}</p>
                        <p className="text-xs text-blue-500 mt-0.5">{uni.location}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedUniversity?.id === uni.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedUniversity?.id === uni.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {universities.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    No campuses available yet.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => { if (selectedUniversity) setStep(1) }}
              disabled={!selectedUniversity}
              className="w-full mt-6 py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)' }}
            >
              Continue with {selectedUniversity?.shortName ?? 'your campus'}
              <ChevronRight className="w-5 h-5" />
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // STEP 1 — Email + name + phone
  // ════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white tracking-tight">BATAMART</h1>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-blue-300 text-xs font-semibold">
                {selectedUniversity?.shortName} — {selectedUniversity?.location}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900 mb-1">Create account</h2>
            <p className="text-sm text-gray-500 mb-6">Join the {selectedUniversity?.shortName} marketplace</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="08012345678"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="wantToSell"
                  checked={wantToSell}
                  onChange={e => setWantToSell(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <label htmlFor="wantToSell" className="text-sm text-gray-700">
                  I also want to sell on {selectedUniversity?.shortName}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)' }}
              >
                {loading ? 'Sending OTP…' : 'Continue →'}
              </button>
            </form>

            <button onClick={() => setStep(0)} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600">
              ← Change campus
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // STEP 2 — OTP verification
  // ════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white">BATAMART</h1>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900 mb-1">Verify your email</h2>
            <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code sent to <strong>{email}</strong></p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
            )}

            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)' }}
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>

            <button onClick={() => setStep(1)} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // STEP 3 — Password + terms
  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">BATAMART</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
            <MapPin className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-blue-300 text-xs font-semibold">{selectedUniversity?.shortName}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-black text-gray-900 mb-1">Set your password</h2>
          <p className="text-sm text-gray-500 mb-6">Almost done, {name}!</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min 8 characters, include a number"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {referralCode && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-sm text-green-700">
                🎁 Referral code <strong>{referralCode}</strong> applied
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 font-semibold">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-blue-600 font-semibold">Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToTerms}
              className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#1a3f8f,#3b9ef5)' }}
            >
              {loading ? 'Creating account…' : `Join ${selectedUniversity?.shortName} 🎉`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' }}>
        <div className="text-white text-xl font-bold">Loading…</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}