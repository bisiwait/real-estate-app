'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildLineMeTextShareUrl } from '@/lib/line-inquiry-share-text'

const ASSIGN_DELAY_MS = 100
const FALLBACK_CHECK_MS = 3000

/**
 * スマホ: `line.me/R/msg/text/` へ遷移（文言プリフィル）。
 * クリップボード・line_inquiry_counts は呼び出し元のユーザー操作ハンドラで行う。
 */
export function useLineTextShareLaunch(shareText: string) {
    const [phase, setPhase] = useState<'idle' | 'sending' | 'fallback'>('idle')
    const assignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startHrefRef = useRef<string>('')

    const textShareUrl = useMemo(() => {
        const t = shareText.trim()
        if (!t) return ''
        return buildLineMeTextShareUrl(t)
    }, [shareText])

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
        const url = textShareUrl
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
    }, [textShareUrl, clearTimers])

    return {
        phase,
        isSending: phase === 'sending',
        showFallback: phase === 'fallback',
        launchAssign,
        textShareUrl,
    }
}
