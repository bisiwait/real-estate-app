'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

/**
 * URL の session_id があるとき、Webhook 待ちせず Stripe からセッションを検証して Pro 同期する。
 */
export function CheckoutSessionSync() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const ran = useRef(false)

    useEffect(() => {
        const sessionId = searchParams.get('session_id')?.trim()
        if (!sessionId || ran.current) return
        ran.current = true

        void (async () => {
            try {
                const res = await fetch('/api/stripe/sync-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                })
                if (res.ok) {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('session_id')
                    url.searchParams.delete('upgrade_success')
                    const qs = url.searchParams.toString()
                    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, { scroll: false })
                } else {
                    const data = (await res.json().catch(() => ({}))) as { error?: string }
                    console.warn('[CheckoutSessionSync] sync failed', res.status, data?.error)
                }
            } catch (e) {
                console.warn('[CheckoutSessionSync]', e)
            }
        })()
    }, [searchParams, router])

    return null
}
