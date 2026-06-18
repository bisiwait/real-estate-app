'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BulkConfirmButtonProps {
    propertyIds: string[]
    dict: any
    className?: string
}

async function refreshListings(propertyIds: string[]) {
    const res = await fetch('/api/properties/refresh-listing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds }),
    })
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: res.ok, error: body.error ?? res.statusText }
}

export default function BulkConfirmButton({ propertyIds, dict, className }: BulkConfirmButtonProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
    const router = useRouter()

    if (propertyIds.length === 0) return null

    const handleBulkConfirm = async () => {
        const confirmed = window.confirm(
            dict.bulk_confirm_message
                .replace('{count}', String(propertyIds.length))
                .replace('{action}', dict.property_refresh_label)
        )
        if (!confirmed) return

        setLoading(true)
        setStatus('loading')

        try {
            const { ok, error } = await refreshListings(propertyIds)

            if (!ok) {
                alert(`${dict.update_failed ?? '更新に失敗しました'}: ${error}`)
                setStatus('idle')
            } else {
                setStatus('success')
                setTimeout(() => {
                    router.refresh()
                    setStatus('idle')
                }, 2000)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            alert(`${dict.error_occurred ?? 'エラーが発生しました'}: ${msg}`)
            setStatus('idle')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleBulkConfirm}
            disabled={loading || status === 'success'}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-xs transition-all shadow-lg hover:shadow-xl active:scale-95 ${status === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-navy-primary text-white hover:bg-navy-secondary'
                } ${className ?? ''}`}
        >
            {status === 'loading' ? (
                <Loader2 size={14} className="animate-spin" />
            ) : status === 'success' ? (
                <CheckCircle2 size={14} />
            ) : (
                <RefreshCw size={14} />
            )}
            <span>
                {status === 'loading'
                    ? dict.updating
                    : status === 'success'
                        ? dict.bulk_refresh_done
                        : dict.bulk_refresh_button}
            </span>
        </button>
    )
}
