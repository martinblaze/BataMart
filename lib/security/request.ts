import { NextRequest, NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function normalizeOrigin(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function allowedOrigins(): Set<string> {
  const set = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const localhost = 'http://localhost:3000'
  ;[appUrl, vercelUrl, localhost].forEach((v) => {
    const origin = normalizeOrigin(v)
    if (origin) set.add(origin)
  })
  return set
}

export function enforceJsonRequest(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  return null
}

export function enforceSameOrigin(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null
  const authHeader = req.headers.get('authorization')
  // CSRF is a browser-cookie threat. Explicit bearer-token requests are exempt.
  if (authHeader && authHeader.startsWith('Bearer ')) return null
  const origin = normalizeOrigin(req.headers.get('origin'))
  const referer = normalizeOrigin(req.headers.get('referer'))
  const hostOrigin = normalizeOrigin(req.nextUrl.origin)
  const allowed = allowedOrigins()
  if (hostOrigin) allowed.add(hostOrigin)
  const candidate = origin || referer
  if (!candidate || !allowed.has(candidate)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }
  return null
}
