'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface PropertyEndListingButtonProps {
    propertyId: string
    currentStatus: string
    className?: string
}

/** 公開中・商談中・成約済の物件をサイト上から非表示（下書き）にする */
export default function PropertyEndListingButton({
    propertyId,
    currentStatus,
    className,
}: PropertyEndListingButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const canEnd = ['published', 'under_negotiation', 'contracted'].includes(currentStatus)
    if (!canEnd) return null

    const handleEnd = async () => {
        if (
            !window.confirm(
                '掲載を終了すると、サイト上では非表示（下書き）になります。ダッシュボードから再編集して公開し直せます。終了しますか？'
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
                <div className="flex-1 px-2 py-1.5 flex items-center justify-center min-h-[2.5rem]">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleEnd}
                    disabled={loading}
                    className="w-full px-2 py-2.5 rounded-2xl text-[11px] font-black border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                    終了
                </button>
            )}
        </div>
    )
}
