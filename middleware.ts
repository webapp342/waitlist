import { NextRequest, NextResponse } from 'next/server'

// Paths to simulate waiting room
const MATCHED_PATHS = [
  '/presale',
  '/presale/'
  
]

const WAIT_SECONDS = 60
const COOKIE_UNTIL = 'sim-wait-until'
const COOKIE_DONE = 'sim-wait-done'
const COOKIE_POS = 'sim-pos'
const COOKIE_TOTAL = 'sim-total'

// Launch window and prelaunch queue
// Use ISO strings to avoid zero-based month confusion
const LAUNCH_MS = Date.parse('2025-08-10T12:00:00Z')
const PRELAUNCH_START_MS = Date.parse('2025-08-10T11:00:00Z')
const WINDOW_START_MS = LAUNCH_MS
const WINDOW_END_MS = Date.parse('2025-08-10T13:00:00Z')

export const config = {
  matcher: [
    '/presale',
    '/presale/:path*',
    
  ],
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isMatched = MATCHED_PATHS.some((p) => pathname === p || pathname.startsWith(p))
  if (!isMatched) return NextResponse.next()

  const now = Date.now()
  // Prelaunch: between 11:00 and 12:00 UTC force wait until launch
  if (now >= PRELAUNCH_START_MS && now < LAUNCH_MS) {
    const target = new URL('/wait', req.url)
    target.searchParams.set('return', pathname)
    const res = NextResponse.redirect(target)
    // Force countdown to exact launch moment
    res.cookies.set(COOKIE_UNTIL, String(LAUNCH_MS), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 })
    // Seed queue cookies if missing
    const total = req.cookies.get(COOKIE_TOTAL)?.value ?? String(Math.floor(5000 + Math.random() * 5000))
    const pos = req.cookies.get(COOKIE_POS)?.value ?? String(Math.max(1, Math.min(Number(total), Math.floor(500 + Math.random() * 4500))))
    res.cookies.set(COOKIE_TOTAL, total, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 })
    res.cookies.set(COOKIE_POS, pos, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 })
    return res
  }

  // Only activate waiting room inside the launch window
  const withinWindow = now >= WINDOW_START_MS && now < WINDOW_END_MS
  if (!withinWindow) return NextResponse.next()

  const waitDone = req.cookies.get(COOKIE_DONE)?.value === '1'
  if (waitDone) return NextResponse.next()

  const untilStr = req.cookies.get(COOKIE_UNTIL)?.value
  const until = untilStr ? Number(untilStr) : NaN

  if (!untilStr || isNaN(until)) {
    // First time: set until and redirect to wait page
    const target = new URL('/wait', req.url)
    target.searchParams.set('return', pathname)
    const res = NextResponse.redirect(target)
    res.cookies.set(COOKIE_UNTIL, String(now + WAIT_SECONDS * 1000), {
      path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10,
    })
    // Generate random queue totals for simulation
    const total = Math.floor(5000 + Math.random() * 5000) // 5k - 10k
    const pos = Math.max(1, Math.min(total, Math.floor(500 + Math.random() * 4500))) // 500 - 5k
    res.cookies.set(COOKIE_TOTAL, String(total), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10 })
    res.cookies.set(COOKIE_POS, String(pos), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10 })
    return res
  }

  if (now < until) {
    // Still waiting
    const target = new URL('/wait', req.url)
    target.searchParams.set('return', pathname)
    const res = NextResponse.redirect(target)
    // Ensure client-readable cookies exist on every redirect
    res.cookies.set(COOKIE_UNTIL, String(until), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10 })
    const hasTotal = !!req.cookies.get(COOKIE_TOTAL)?.value
    const hasPos = !!req.cookies.get(COOKIE_POS)?.value
    if (!hasTotal) {
      const total = Math.floor(5000 + Math.random() * 5000)
      res.cookies.set(COOKIE_TOTAL, String(total), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10 })
    }
    if (!hasPos) {
      const total = Number(req.cookies.get(COOKIE_TOTAL)?.value || 8000)
      const pos = Math.max(1, Math.min(total, Math.floor(500 + Math.random() * 4500)))
      res.cookies.set(COOKIE_POS, String(pos), { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 10 })
    }
    return res
  }

  // Passed waiting window; allow and set done cookie briefly
  const res = NextResponse.next()
  res.cookies.set(COOKIE_DONE, '1', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 30 })
  return res
}


