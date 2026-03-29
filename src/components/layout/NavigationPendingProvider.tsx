'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 内部リンクを押してからルートが切り替わるまで上部にインジケータを表示する。
 */
export default function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      setPending(false)
    }
  }, [pathname])

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

      setPending(true)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  return (
    <>
      {pending ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[500] h-[3px] overflow-hidden bg-slate-200/90"
          role="status"
          aria-live="polite"
          aria-label="ページを読み込み中"
        >
          <div className="h-full w-[40%] max-w-md animate-nav-pending-bar bg-gradient-to-r from-navy-primary via-[#2563eb] to-navy-primary" />
        </div>
      ) : null}
      {children}
    </>
  )
}
