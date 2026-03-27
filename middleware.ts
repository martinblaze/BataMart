// middleware.ts — place in project root, same level as /app
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// ── FIX #1: Middleware now actually VERIFIES the JWT signature.
// Previously it only checked that the token had 3 dot-separated parts,
// which means anyone could forge a token like "abc.def.ghi" and get in.
// Now we use `jose` (already a Next.js peer dep) to verify the signature
// against JWT_SECRET before allowing any /admin route through.
//
// REQUIRED: Add JWT_SECRET to your .env file.
// It must be the same secret your API routes use when signing tokens.

async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // If JWT_SECRET is not configured, fail closed — never let anyone in
    console.error('[middleware] JWT_SECRET is not set. Admin routes are locked.')
    return false
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    )
    // Must be a real ADMIN role — a valid user JWT for a non-admin is still rejected
    return payload.role === 'ADMIN'
  } catch {
    // Token is expired, tampered with, or signed with the wrong secret
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect all /admin routes except /admin-login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    const token = req.cookies.get('adminToken')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }

    const isValid = await verifyAdminToken(token)
    if (!isValid) {
      // Clear the bad/expired cookie and redirect
      const response = NextResponse.redirect(new URL('/admin-login', req.url))
      response.cookies.delete('adminToken')
      return response
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}