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
    dict: any
}

/** 公開中の物件をサイト上から非表示（下書き）にする */
export default function PropertyEndListingButton({
    propertyId,
    currentStatus,
    className,
    onEnded,
    dict,
}: PropertyEndListingButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const canEnd = currentStatus === 'published'
    if (!canEnd) return null

    const handleEnd = async () => {
        if (
            !window.confirm(
                dict.end_listing_confirm
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
                alert(`${dict.end_listing_failed}: ${error.message}`)
            } else {
                onEnded?.(propertyId)
                router.refresh()
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            alert(`${dict.error_occurred}: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`inline-flex shrink-0 items-center ${className || ''}`}>
            {loading ? (
                <span className="inline-flex items-center justify-center rounded bg-slate-700 px-1.5 py-0.5 ring-1 ring-slate-900/15">
                    <Loader2 className="h-3 w-3 animate-spin text-white" aria-hidden />
                </span>
            ) : (
                <button
                    type="button"
                    onClick={handleEnd}
                    disabled={loading}
                    className="inline-flex items-center gap-0.5 rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-slate-900/15 transition hover:bg-slate-800 active:scale-[0.98]"
                >
                    <CircleStop className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
                    {dict.end_listing_button}
                </button>
            )}
        </div>
    )
}
