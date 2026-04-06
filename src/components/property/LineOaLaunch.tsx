'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  lineAddFriendLinkHref,
  isLineInAppBrowser,
  normalizeLineFriendUrlInput,
  shouldUseLineInAppAssignWorkaround,
} from '@/lib/line-contact-url'
import { Loader2 } from 'lucide-react'

/**
 * LINE 内蔵ブラウザの assign ワークアラウンドを踏まえて遷移する。
 * 必ずユーザークリックと同一の同期スタックで呼ぶこと（setTimeout 後だと iOS / LINE WebView でブロックされやすい）。
 */
export function navigateToLineInquiry(officialUrl: string) {
  const raw = normalizeLineFriendUrlInput(officialUrl)
  const go = lineAddFriendLinkHref(raw)
  if (go.startsWith('http') && isLineInAppBrowser() && shouldUseLineInAppAssignWorkaround(go)) {
    window.location.assign(go)
    return
  }
  window.location.assign(go)
}

export function LineOaLaunchOverlay({ open, message }: { open: boolean; message: string }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100020] flex flex-col items-center justify-center bg-slate-900/55 p-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="mb-4 h-12 w-12 animate-spin text-white" aria-hidden />
      <p className="max-w-xs text-center text-base font-bold text-white">{message}</p>
    </div>
  )
}

const OVERLAY_FAILSAFE_MS = 2800

export function useLineOaLaunch(officialLineUrl: string | undefined) {
  const [launching, setLaunching] = useState(false)
  const failSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (failSafeRef.current) {
        clearTimeout(failSafeRef.current)
        failSafeRef.current = null
      }
    }
  }, [])

  const launch = useCallback(() => {
    if (!officialLineUrl?.trim()) return
    if (failSafeRef.current) {
      clearTimeout(failSafeRef.current)
      failSafeRef.current = null
    }
    setLaunching(true)
    // 遅延なしで遷移（遅延するとユーザージスチャーが切れて LINE 起動が無視される）
    navigateToLineInquiry(officialLineUrl)
    failSafeRef.current = window.setTimeout(() => {
      failSafeRef.current = null
      setLaunching(false)
    }, OVERLAY_FAILSAFE_MS)
  }, [officialLineUrl])

  return { launching, launch }
}
