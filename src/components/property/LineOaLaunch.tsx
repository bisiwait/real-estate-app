'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeLineFriendUrlInput } from '@/lib/line-contact-url'
import { postLineInquiryLog } from '@/lib/line-inquiry-log-client'

/** 描画を1フレーム進めてから叩くまでの待ち（ms） */
const ASSIGN_DELAY_MS = 100
/** 同一ページのままならフォールバックリンクを出すまで（ms） */
const FALLBACK_CHECK_MS = 3000

/**
 * サーバーが組んだ `https://line.me/R/oaMessage/...` をそのまま assign。
 * line:// へは変換しない（直通 https の方が起動が安定しやすい）。
 */
export function assignLineMeOaMessageUrl(officialUrl: string) {
  const u = normalizeLineFriendUrlInput(officialUrl).trim()
  if (!u) return
  window.location.assign(u)
}

export type LineOaLaunchPhase = 'idle' | 'sending' | 'fallback'

export function useLineOaLaunch(
  officialLineUrl: string | undefined,
  lineClickPropertyId?: string,
  lineClickAgentId?: string
) {
  const [phase, setPhase] = useState<LineOaLaunchPhase>('idle')
  const assignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startHrefRef = useRef<string>('')

  const clearTimers = useCallback(() => {
    if (assignTimerRef.current) {
      clearTimeout(assignTimerRef.current)
      assignTimerRef.current = null
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const launch = useCallback(() => {
    const url = officialLineUrl?.trim()
    if (!url) return
    clearTimers()
    startHrefRef.current = window.location.href
    setPhase('sending')
    if (lineClickPropertyId?.trim()) {
      postLineInquiryLog(
        {
          propertyId: lineClickPropertyId.trim(),
          agentId: lineClickAgentId?.trim(),
        },
        { throttleScope: 'line-launch' }
      )
    }
    assignTimerRef.current = window.setTimeout(() => {
      assignTimerRef.current = null
      assignLineMeOaMessageUrl(url)
    }, ASSIGN_DELAY_MS)
    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackTimerRef.current = null
      try {
        if (
          document.visibilityState === 'visible' &&
          window.location.href === startHrefRef.current
        ) {
          setPhase('fallback')
        } else {
          setPhase('idle')
        }
      } catch {
        setPhase('idle')
      }
    }, FALLBACK_CHECK_MS)
  }, [officialLineUrl, clearTimers, lineClickPropertyId, lineClickAgentId])

  const directUrl = officialLineUrl?.trim() ?? ''

  return {
    phase,
    isSending: phase === 'sending',
    showFallback: phase === 'fallback',
    launch,
    directUrl,
  }
}
