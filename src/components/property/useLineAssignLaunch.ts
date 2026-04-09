'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ASSIGN_DELAY_MS = 100
const FALLBACK_CHECK_MS = 3000

/**
 * スマホ: 指定した line.me URL（通常は oaMessage ＋下書き）へ遷移。
 * クリップボード・line_inquiry_counts は呼び出し元のユーザー操作ハンドラで行う。
 */
export function useLineAssignLaunch(launchUrl: string) {
    const [phase, setPhase] = useState<'idle' | 'sending' | 'fallback'>('idle')
    const assignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startHrefRef = useRef<string>('')

    const url = useMemo(() => launchUrl.trim(), [launchUrl])

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

    const launchAssign = useCallback(() => {
        if (!url) return
        clearTimers()
        startHrefRef.current = window.location.href
        setPhase('sending')
        assignTimerRef.current = window.setTimeout(() => {
            assignTimerRef.current = null
            window.location.assign(url)
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
    }, [url, clearTimers])

    return {
        phase,
        isSending: phase === 'sending',
        showFallback: phase === 'fallback',
        launchAssign,
        /** QR・フォールバックリンク用（oaMessage 等） */
        launchUrl: url,
    }
}
