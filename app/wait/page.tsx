'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/header_fixed'

export default function WaitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-white"><Header /><main className="flex items-center justify-center pt-16 pb-10"><div className="text-sm text-gray-400">Loading…</div></main></div>}>
      <WaitPageContent />
    </Suspense>
  )
}

function WaitPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const ret = params.get('return') || '/presale'
  const WAIT_SECONDS = 60
  const TARGET_TOTAL = 162732
  const PRELAUNCH_MINUTES = 60
  const [remaining, setRemaining] = useState<number>(WAIT_SECONDS)
  const [pos, setPos] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [initialLeft, setInitialLeft] = useState<number | null>(null)
  const [displayPos, setDisplayPos] = useState<number | null>(null)
  const [displayTotal, setDisplayTotal] = useState<number | null>(null)

  useEffect(() => {
    let tid: any
    const tick = () => {
      // Read cookie set by middleware
      const m = document.cookie.match(/(?:^|; )sim-wait-until=([^;]+)/)
      const until = m ? Number(decodeURIComponent(m[1])) : 0
      const p = document.cookie.match(/(?:^|; )sim-pos=([^;]+)/)
      const totalMatch = document.cookie.match(/(?:^|; )sim-total=([^;]+)/)
      if (p && pos === null) setPos(Number(decodeURIComponent(p[1])))
      if (totalMatch && total === null) setTotal(Number(decodeURIComponent(totalMatch[1])))
      const now = Date.now()
      const left = Math.max(0, Math.ceil((until - now) / 1000))
      setRemaining(left)
      if (initialLeft === null && left > 0) {
        setInitialLeft(left)
      }
      if (pos !== null && (initialLeft ?? left) > 0) {
        const baseline = initialLeft ?? left
        const f = Math.max(0, Math.min(1, left / baseline))
        const current = Math.max(1, Math.ceil(1 + (pos - 1) * f))
        setDisplayPos(current)
      }
      if (total !== null && (initialLeft ?? left) > 0) {
        const leftMs = Math.max(0, (until - now))
        const isPrelaunch = leftMs > 90_000 // treat >90s as prelaunch window (minutes-based)
        if (isPrelaunch) {
          const minutesLeft = Math.ceil(leftMs / 60_000)
          const elapsed = Math.max(0, Math.min(PRELAUNCH_MINUTES, PRELAUNCH_MINUTES - minutesLeft))
          const frac = elapsed / PRELAUNCH_MINUTES
          const scheduled = Math.round(total + (TARGET_TOTAL - total) * frac)
          setDisplayTotal(Math.min(TARGET_TOTAL, Math.max(total, scheduled)))
        } else {
          // inside 60s launch queue: keep previous smooth increase
          const baseline = initialLeft ?? left
          const f = Math.max(0, Math.min(1, left / baseline))
          const projected = Math.floor(total + (TARGET_TOTAL - total) * (1 - f))
          setDisplayTotal(Math.min(TARGET_TOTAL, Math.max(total, projected)))
        }
      }
      if (left <= 0) {
        router.replace(ret)
      } else {
        tid = setTimeout(tick, 500)
      }
    }
    tick()
    return () => tid && clearTimeout(tid)
  }, [ret, router, pos, total, initialLeft])

  const mm = useMemo(() => String(Math.floor(remaining / 60)).padStart(2, '0'), [remaining])
  const ss = useMemo(() => String(remaining % 60).padStart(2, '0'), [remaining])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="flex items-center justify-center pt-16 pb-10">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 text-center w-[320px]">
          <div className="text-sm text-gray-400 mb-2">Please wait to access presale</div>
          <div className="text-4xl font-mono text-yellow-400 mb-1">{mm}:{ss}</div>
          {displayPos !== null && (displayTotal ?? total) !== null && (
            <div className="text-[11px] text-gray-500 mb-1">Your position: {displayPos.toLocaleString()} / {(displayTotal ?? total)!.toLocaleString()}</div>
          )}
          <div className="text-[11px] text-gray-500">You will be redirected automatically</div>

          {/* FCFS and preparation guidance */}
          <div className="mt-4 text-left">
            <div className="text-xs font-medium text-zinc-300 mb-1">Important launch information</div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
              <li>FCFS launch. Allocation is not guaranteed; on-chain confirmations determine order.</li>
              <li>Fixed allocation: $100 per purchase at presale price ($0.14 per BBLP).</li>
              <li>Prepare balances in advance: ETH on Ethereum and/or BNB on BSC, plus sufficient gas.</li>
              <li>Connect your wallet and be ready to switch networks quickly at 12:00 UTC.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}


