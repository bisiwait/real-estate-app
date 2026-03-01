'use client'

import { useState } from 'react'
import { Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardActionsProps {
    propertyId: string
    propertyTitle: string
}

export default function DashboardActions({ propertyId, propertyTitle }: DashboardActionsProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        const confirmed = window.confirm(`「${propertyTitle}」を削除しますか？この処理をすると戻せません。`)

        if (!confirmed) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId)

            if (error) {
                alert('削除に失敗しました: ' + error.message)
            } else {
                router.refresh()
            }
        } catch (err: any) {
            alert('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={() => router.push(`/dashboard/edit/${propertyId}`)}
                className="p-2.5 rounded-xl bg-slate-50 text-navy-primary hover:bg-navy-primary hover:text-white transition-all border border-slate-100"
                title="編集する"
            >
                <Edit3 className="w-5 h-5" />
            </button>

            <button
                onClick={handleDelete}
                disabled={loading}
                className="p-2.5 rounded-xl bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-slate-100 disabled:opacity-50"
                title="削除する"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Trash2 className="w-5 h-5" />
                )}
            </button>
        </div>
    )
}
