'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CircleStop } from 'lucide-react'

interface PropertyEndListingButtonProps {
    propertyId: string
    currentStatus: string
    className?: string
    onEnded?: (propertyId: string) => void
}

/** 公開中・商談中・成約済の物件をサイト上から非表示（下書き）にする */
export default function PropertyEndListingButton({
    propertyId,
    currentStatus,
    className,
    onEnded,
}: PropertyEndListingButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const canEnd = ['published', 'under_negotiation', 'contracted'].includes(currentStatus)
    if (!canEnd) return null

    const handleEnd = async () => {
        if (
            !window.confirm(
                '掲載を終了すると、サイト上では非表示（下書き）になります。「再公開する」からいつでも掲載を再開できます。終了しますか？'
            )
        ) {
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .update({ status: 'draft' })
                .eq('id', propertyId)

            if (error) {
                alert('掲載終了の更新に失敗しました: ' + error.message)
            } else {
                onEnded?.(propertyId)
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
                <div className="flex min-h-[2.5rem] w-full items-center justify-center px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleEnd}
                    disabled={loading}
                    className="inline-flex w-full min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-slate-700 px-4 py-2 text-xs font-bold text-white shadow-md ring-1 ring-slate-900/20 transition hover:bg-slate-800 active:scale-[0.98] sm:text-[11px]"
                >
                    <CircleStop className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    掲載終了
                </button>
            )}
        </div>
    )
}
