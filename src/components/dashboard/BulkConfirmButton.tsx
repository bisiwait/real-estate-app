'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BulkConfirmButtonProps {
    propertyIds: string[]
}

export default function BulkConfirmButton({ propertyIds }: BulkConfirmButtonProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
    const supabase = createClient()
    const router = useRouter()

    if (propertyIds.length === 0) return null

    const handleBulkConfirm = async () => {
        const confirmed = window.confirm(`現在公開中の物件（${propertyIds.length}件）をすべて掲載継続にしますか？`)
        if (!confirmed) return

        setLoading(true)
        setStatus('loading')

        try {
            const { error } = await supabase
                .from('properties')
                .update({
                    last_confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', propertyIds)

            if (error) {
                alert(`更新に失敗しました: ${error.message}`)
                setStatus('idle')
            } else {
                setStatus('success')
                setTimeout(() => {
                    router.refresh()
                    setStatus('idle')
                }, 2000)
            }
        } catch (err: any) {
            alert(`エラーが発生しました: ${err.message}`)
            setStatus('idle')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleBulkConfirm}
            disabled={loading || status === 'success'}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs transition-all shadow-lg hover:shadow-xl active:scale-95 ${status === 'success'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-navy-primary text-white hover:bg-navy-secondary'
                }`}
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
                    ? '更新中...'
                    : status === 'success'
                        ? 'すべて更新完了'
                        : 'すべての公開中物件を継続にする'}
            </span>
        </button>
    )
}
