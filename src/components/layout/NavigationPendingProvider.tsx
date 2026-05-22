'use client'

import React, {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type NavigationPendingContextValue = {
  startNavigationPending: () => void
}

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null)

/** `router.push` 等・言語切替ボタンからナビ開始を通知し、ローディング UI を出す */
export function useStartNavigationPending() {
  const ctx = useContext(NavigationPendingContext)
  return ctx?.startNavigationPending ?? (() => {})
}

function RouteChangeNotifier({ onKeyChange }: { onKeyChange: (routeKey: string) => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    const key = qs ? `${pathname}?${qs}` : pathname
    onKeyChange(key)
  }, [pathname, searchParams, onKeyChange])

  return null
}

/** スクロールとタップを区別する移動閾値（px） */
const TAP_MOVE_THRESHOLD_PX = 12

type LinkNavCandidate = {
  routeTarget: string
  startX: number
  startY: number
}

/**
 * 内部リンクのタップ確定時のみ pending（pointerdown 即時だとモバイルスクロールで誤発火）。
 * 言語切替など `router.push` は `useStartNavigationPending()` で明示通知。
 * ルート確定は pathname + searchParams で検知（クエリのみの遷移でも pending を解除）。
 */
function NavigationPendingInner({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const prevRouteKeyRef = useRef<string | null>(null)
  const linkNavCandidateRef = useRef<LinkNavCandidate | null>(null)

  const syncRouteKey = useCallback((routeKey: string) => {
    if (prevRouteKeyRef.current === null) {
      prevRouteKeyRef.current = routeKey
      return
    }
    if (prevRouteKeyRef.current !== routeKey) {
      prevRouteKeyRef.current = routeKey
      setPending(false)
    }
  }, [])

  const startNavigationPending = useCallback(() => {
    setPending(true)
  }, [])

  useEffect(() => {
    if (!pending) {
      setShowOverlay(false)
      return
    }
    const t = window.setTimeout(() => setShowOverlay(true), 280)
    return () => window.clearTimeout(t)
  }, [pending])

  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => setPending(false), 12000)
    return () => window.clearTimeout(t)
  }, [pending])

  useEffect(() => {
    const resolveTarget = (href: string): string | null => {
      try {
        const u = new URL(href, window.location.origin)
        if (u.origin !== window.location.origin) return null
        return `${u.pathname}${u.search}`
      } catch {
        return null
      }
    }

    const clearLinkNavCandidate = () => {
      linkNavCandidateRef.current = null
    }

    const movedBeyondTapThreshold = (clientX: number, clientY: number) => {
      const c = linkNavCandidateRef.current
      if (!c) return true
      const dx = clientX - c.startX
      const dy = clientY - c.startY
      return dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX * TAP_MOVE_THRESHOLD_PX
    }

    const commitLinkNavCandidate = (clientX: number, clientY: number) => {
      const c = linkNavCandidateRef.current
      clearLinkNavCandidate()
      if (!c) return
      const dx = clientX - c.startX
      const dy = clientY - c.startY
      if (dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX * TAP_MOVE_THRESHOLD_PX) return

      const current = `${window.location.pathname}${window.location.search}`
      if (c.routeTarget === current) return

      setPending(true)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const el = e.target as HTMLElement | null
      const a = el?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (a.target === '_blank' || a.getAttribute('download') != null) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

      const target = resolveTarget(href)
      if (target == null) return

      const current = `${window.location.pathname}${window.location.search}`
      if (target === current) return

      linkNavCandidateRef.current = {
        routeTarget: target,
        startX: e.clientX,
        startY: e.clientY,
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!linkNavCandidateRef.current) return
      if (movedBeyondTapThreshold(e.clientX, e.clientY)) {
        clearLinkNavCandidate()
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      commitLinkNavCandidate(e.clientX, e.clientY)
    }

    const onPointerCancel = () => {
      clearLinkNavCandidate()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
    }
  }, [])

  return (
    <NavigationPendingContext.Provider value={{ startNavigationPending }}>
      <Suspense fallback={null}>
        <RouteChangeNotifier onKeyChange={syncRouteKey} />
      </Suspense>
      {pending ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[500] h-[4px] overflow-hidden bg-slate-200/95 shadow-sm"
          role="status"
          aria-live="polite"
          aria-label="ページを読み込み中"
        >
          <div className="h-full w-[40%] max-w-md animate-nav-pending-bar bg-gradient-to-r from-navy-primary via-[#2563eb] to-navy-primary" />
        </div>
      ) : null}
      {pending && showOverlay ? (
        <div
          className="pointer-events-none fixed inset-0 z-[480] flex items-center justify-center bg-slate-900/18 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="ページを読み込み中"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-4 shadow-xl">
            <Loader2 className="h-9 w-9 shrink-0 animate-spin text-navy-primary" aria-hidden />
            <span className="text-sm font-bold text-navy-secondary tabular-nums">読み込み中…</span>
          </div>
        </div>
      ) : null}
      {children}
    </NavigationPendingContext.Provider>
  )
}

export default function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavigationPendingInner>{children}</NavigationPendingInner>
}
