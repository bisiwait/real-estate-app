'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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
    const supabase = createClient()

    if (currentStatus !== 'draft') return null

    const handleRepublish = async () => {
        const nextStatus = isApproved ? 'published' : 'pending'
        const msg = isApproved
            ? 'この物件をサイトに再掲載（公開中）しますか？'
            : '承認依頼として再提出しますか？（管理者の承認後に公開されます）'
        if (!window.confirm(msg)) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .update({ status: nextStatus })
                .eq('id', propertyId)

            if (error) {
                alert('再公開の更新に失敗しました: ' + error.message)
            } else {
                onRepublished?.(propertyId, nextStatus)
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
        <div className={`flex items-center ${className || ''}`}>
            {loading ? (
                <div className="flex min-h-[2.5rem] min-w-[5rem] items-center justify-center px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleRepublish}
                    disabled={loading}
                    className="inline-flex w-full min-h-[2.5rem] items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md ring-1 ring-emerald-700/20 transition hover:bg-emerald-700 active:scale-[0.98] sm:text-[11px]"
                >
                    {isApproved ? '再公開する' : '公開を申請'}
                </button>
            )}
        </div>
    )
}
