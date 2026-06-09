'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCw } from 'lucide-react'

interface PropertyRepublishButtonProps {
    propertyId: string
    currentStatus: string
    isApproved: boolean
    className?: string
    onRepublished?: (propertyId: string, newStatus: string) => void
}

/** 下書きから再公開（承認済みなら即公開、未承認なら承認待ち） */
export default function PropertyRepublishButton({
    propertyId,
    currentStatus,
    isApproved,
    className,
    onRepublished,
}: PropertyRepublishButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    if (currentStatus !== 'draft') return null

    const handleRepublish = async () => {
        const nextStatus = isApproved ? 'published' : 'pending'
        const msg = isApproved
            ? 'この物件をサイトに再掲載（公開中）しますか？'
            : '承認依頼として再提出しますか？（管理者の承認後に公開されます）'
        if (!window.confirm(msg)) return

        setLoading(true)
        try {
            const res = await fetch(`/api/properties/${propertyId}/listing-status`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'republish' }),
            })

            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: string }
                alert('再公開の更新に失敗しました: ' + (body.error ?? res.statusText))
            } else {
                const data = (await res.json()) as { property?: { status?: string } }
                onRepublished?.(propertyId, data.property?.status ?? nextStatus)
                router.refresh()
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            alert('エラーが発生しました: ' + msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`inline-flex shrink-0 items-center ${className || ''}`}>
            {loading ? (
                <span className="inline-flex items-center justify-center rounded bg-emerald-600 px-1.5 py-0.5 ring-1 ring-emerald-700/20">
                    <Loader2 className="h-3 w-3 animate-spin text-white" aria-hidden />
                </span>
            ) : (
                <button
                    type="button"
                    onClick={handleRepublish}
                    disabled={loading}
                    className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-emerald-700/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                    <RotateCw className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
                    {isApproved ? '再公開する' : '公開を申請'}
                </button>
            )}
        </div>
    )
}
