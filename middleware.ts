// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// ── Pages only riders can access ─────────────────────────────────────────────
const RIDER_ONLY_PAGES = ['/rider-dashboard']

// ── Pages riders ARE allowed on (besides rider-only pages) ───────────────────
const RIDER_ALLOWED_PAGES = [
  '/wallet',
  '/notifications',
  '/rider/login',
  '/rider-dashboard',
]

// ── Pages that are always public (no auth needed) ─────────────────────────────
const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/rider/login',
  '/forgot-password',
  '/verify',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
]

async function decodeToken(token: string): Promise<{ id: string; role: string } | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return { id: payload.sub as string, role: payload.role as string }
  } catch {
    return null
  }
}

async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('[middleware] JWT_SECRET is not set. Admin routes are locked.')
    return false
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload.role === 'ADMIN'
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Admin routes ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = req.cookies.get('adminToken')?.value
    if (!token) return NextResponse.redirect(new URL('/admin-login', req.url))
    const isValid = await verifyAdminToken(token)
    if (!isValid) {
      const res = NextResponse.redirect(new URL('/admin-login', req.url))
      res.cookies.delete('adminToken')
      return res
    }
    return NextResponse.next()
  }

  // ── 2. Rider-only pages — must be logged in as RIDER ────────────────────
  const isRiderPage = RIDER_ONLY_PAGES.some(p => pathname.startsWith(p))
  if (isRiderPage) {
    const token = req.cookies.get('token')?.value
    if (!token) {
      // Not logged in → rider login
      return NextResponse.redirect(new URL('/rider/login', req.url))
    }
    const user = await decodeToken(token)
    if (!user || user.role !== 'RIDER') {
      // Logged in but not a rider → rider login
      return NextResponse.redirect(new URL('/rider/login', req.url))
    }
    return NextResponse.next()
  }

  // ── 3. Regular app pages — block riders from accessing them ─────────────
  // If the path is not a public page and not in the rider-allowed list,
  // and the user is a RIDER → redirect them to their dashboard
  const isPublic = PUBLIC_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isRiderAllowed = RIDER_ALLOWED_PAGES.some(p => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticFile = pathname.startsWith('/_next/') || pathname.includes('.')

  if (!isPublic && !isRiderAllowed && !isApiRoute && !isStaticFile) {
    const token = req.cookies.get('token')?.value
    if (token) {
      const user = await decodeToken(token)
      if (user?.role === 'RIDER') {
        // Rider trying to access a buyer/seller page → back to dashboard
        return NextResponse.redirect(new URL('/rider-dashboard', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/rider-dashboard/:path*',
    '/rider-dashboard',
    '/marketplace/:path*',
    '/cart/:path*',
    '/orders/:path*',
    '/sell/:path*',
    '/my-shop/:path*',
    '/checkout/:path*',
    '/product/:path*',
    '/become-seller/:path*',
    '/myprofile/:path*',
    '/profile/:path*',
    '/dispute/:path*',
    '/referrals/:path*',
    '/search/:path*',
    '/seller/:path*',
    '/notifications/:path*',
    '/wallet/:path*',
  ],
}