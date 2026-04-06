'use client'

import { useCallback, useState } from 'react'
import {
  lineAddFriendLinkHref,
  isLineInAppBrowser,
  normalizeLineFriendUrlInput,
  shouldUseLineInAppAssignWorkaround,
} from '@/lib/line-contact-url'
import { Loader2 } from 'lucide-react'

const LAUNCH_DELAY_MS = 420

/** LINE 内蔵ブラウザの assign ワークアラウンドを踏まえて遷移する */
export function navigateToLineInquiry(officialUrl: string) {
  const raw = normalizeLineFriendUrlInput(officialUrl)
  const go = lineAddFriendLinkHref(raw)
  if (go.startsWith('http') && isLineInAppBrowser() && shouldUseLineInAppAssignWorkaround(go)) {
    window.location.assign(go)
    return
  }
  window.location.href = go
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

export function useLineOaLaunch(officialLineUrl: string | undefined) {
  const [launching, setLaunching] = useState(false)

  const launch = useCallback(() => {
    if (!officialLineUrl?.trim()) return
    setLaunching(true)
    window.setTimeout(() => {
      navigateToLineInquiry(officialLineUrl)
    }, LAUNCH_DELAY_MS)
  }, [officialLineUrl])

  return { launching, launch }
}
