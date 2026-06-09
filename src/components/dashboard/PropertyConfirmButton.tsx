'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PropertyConfirmButtonProps {
    propertyId: string
    title: string
    dict: any
}

export default function PropertyConfirmButton({ propertyId, title, dict }: PropertyConfirmButtonProps) {
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const router = useRouter()

    const handleConfirm = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setLoading(true)
        setConfirmed(true)

        try {
            const res = await fetch('/api/properties/refresh-listing', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyIds: [propertyId] }),
            })

            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string }
                setConfirmed(false)
                alert(`${dict.update_failed ?? '更新に失敗しました'}: ${body.error ?? res.statusText}`)
            } else {
                router.refresh()
            }
        } catch (err: unknown) {
            setConfirmed(false)
            const msg = err instanceof Error ? err.message : String(err)
            alert(`${dict.error_occurred ?? 'エラーが発生しました'}: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleConfirm}
            disabled={loading || confirmed}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl font-black text-[11px] sm:text-sm transition-all shadow-md active:scale-95 whitespace-nowrap min-w-0 w-full ${confirmed
                ? 'bg-emerald-500 text-white cursor-default'
                : 'bg-white text-navy-primary border border-slate-100 hover:border-navy-primary hover:bg-slate-50'
                }`}
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin" />
            ) : confirmed ? (
                <CheckCircle2 size={16} />
            ) : (
                <RefreshCw size={16} />
            )}
            <span>{confirmed ? dict.update_done : dict.property_refresh_label}</span>
        </button>
    )
}
