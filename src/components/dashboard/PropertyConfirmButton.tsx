'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PropertyConfirmButtonProps {
    propertyId: string
    title: string
}

export default function PropertyConfirmButton({ propertyId, title }: PropertyConfirmButtonProps) {
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleConfirm = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setLoading(true)
        // Optimistic UI
        setConfirmed(true)

        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    last_confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', propertyId)

            if (error) {
                setConfirmed(false)
                alert(`更新に失敗しました: ${error.message}`)
            } else {
                // Background refresh
                router.refresh()
            }
        } catch (err: any) {
            setConfirmed(false)
            alert(`エラーが発生しました: ${err.message}`)
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
            <span>{confirmed ? '更新完了' : '掲載更新'}</span>
        </button>
    )
}
