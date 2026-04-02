// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// ── Pages ONLY riders can access ──────────────────────────────────────────────
const RIDER_ONLY_PAGES = ['/rider-dashboard']

// ── The ONLY pages a rider is allowed to visit ────────────────────────────────
const RIDER_ALLOWED_PAGES = [
  '/rider/login',
  '/rider-dashboard',
  '/wallet',
  '/notifications',
]

// ── Pages that are always public (no auth needed) ─────────────────────────────
const PUBLIC_PAGES = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/forgot-password',
  '/verify',
  '/rider/login',
  // NOTE: /login and /signup are intentionally NOT here — riders are
  // blocked from them specifically in the middleware below.
]

async function decodeToken(token: string): Promise<{ userId: string; role?: string } | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return { userId: payload.userId as string, role: payload.role as string | undefined }
  } catch {
    return null
  }
}

async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET
  if (!secret) return false
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload.role === 'ADMIN'
  } catch {
    return false
  }
}

// ── Clears all auth cookies/localStorage and redirects to rider login ─────────
// We can't clear localStorage from middleware (server-side), so we redirect
// to a special URL that the rider/login page handles by clearing storage first.
function forceRiderLogout(req: NextRequest): NextResponse {
  const res = NextResponse.redirect(new URL('/rider/login?reason=no_access', req.url))
  res.cookies.set('token', '', { path: '/', maxAge: 0 })
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Admin routes ───────────────────────────────────────────────────────
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

  // ── 2. Block riders from /login and /signup entirely ─────────────────────
  if (pathname === '/login' || pathname.startsWith('/login/') ||
      pathname === '/signup' || pathname.startsWith('/signup/')) {
    const token = req.cookies.get('token')?.value
    if (token) {
      const user = await decodeToken(token)
      if (user?.role === 'RIDER') {
        // Rider trying to use the main login/signup → force logout + redirect
        return forceRiderLogout(req)
      }
    }
    // Non-riders (or unauthenticated) can proceed to login/signup normally
    return NextResponse.next()
  }

  // ── 3. Rider-only pages — must be logged in as RIDER ─────────────────────
  const isRiderPage = RIDER_ONLY_PAGES.some(p => pathname.startsWith(p))
  if (isRiderPage) {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.redirect(new URL('/rider/login', req.url))
    const user = await decodeToken(token)
    if (!user || user.role !== 'RIDER') {
      return NextResponse.redirect(new URL('/rider/login', req.url))
    }
    return NextResponse.next()
  }

  // ── 4. All other protected pages — riders are NOT welcome ─────────────────
  const isPublic    = PUBLIC_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isRiderAllowed = RIDER_ALLOWED_PAGES.some(p => pathname.startsWith(p))
  const isApiRoute  = pathname.startsWith('/api/')
  const isStaticFile = pathname.startsWith('/_next/') || pathname.includes('.')

  if (!isPublic && !isRiderAllowed && !isApiRoute && !isStaticFile) {
    const token = req.cookies.get('token')?.value
    if (token) {
      const user = await decodeToken(token)
      if (user?.role === 'RIDER') {
        // Rider trying to access any buyer/seller/marketplace page → force logout
        return forceRiderLogout(req)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/login/:path*',
    '/signup',
    '/signup/:path*',
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