'use client'

import { useState } from 'react'
import { CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BulkConfirmButtonProps {
    propertyIds: string[]
    dict: any
}

export default function BulkConfirmButton({ propertyIds, dict }: BulkConfirmButtonProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
    const supabase = createClient()
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
            const { error } = await supabase
                .from('properties')
                .update({
                    last_confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', propertyIds)

            if (error) {
                alert(`${dict.update_failed}: ${error.message}`)
                setStatus('idle')
            } else {
                setStatus('success')
                setTimeout(() => {
                    router.refresh()
                    setStatus('idle')
                }, 2000)
            }
        } catch (err: any) {
            alert(`${dict.error_occurred}: ${err.message}`)
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
                    ? dict.updating
                    : status === 'success'
                        ? dict.bulk_refresh_done
                        : dict.bulk_refresh_button}
            </span>
        </button>
    )
}
