'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Mail, User, Phone, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AgentProfileContactRow } from '@/lib/supabase/fetch-agent-profile-contacts'

type Props = {
    initialRows: AgentProfileContactRow[]
    fetchError?: string | null
}

export default function AgentProfileContactsView({ initialRows, fetchError }: Props) {
    const [rows, setRows] = useState<AgentProfileContactRow[]>(initialRows)
    const [pendingId, setPendingId] = useState<string | null>(null)

    useEffect(() => {
        setRows(initialRows)
    }, [initialRows])

    const toggleHandled = useCallback(async (id: string, next: boolean) => {
        let prevHandled = false
        setRows((list) => {
            const cur = list.find((r) => r.id === id)
            prevHandled = cur?.is_handled ?? false
            return list.map((r) => (r.id === id ? { ...r, is_handled: next } : r))
        })
        setPendingId(id)
        const supabase = createClient()
        const { error } = await supabase.from('agent_contacts').update({ is_handled: next }).eq('id', id)
        setPendingId(null)
        if (error) {
            setRows((list) => list.map((r) => (r.id === id ? { ...r, is_handled: prevHandled } : r)))
            toast.error(error.message || '更新に失敗しました')
            return
        }
        toast.success('保存しました')
    }, [])

    if (fetchError) {
        return (
            <div className="p-6 text-sm font-bold leading-relaxed text-red-800 bg-red-50">
                一覧を読み込めませんでした。Supabase のマイグレーション（agent_contacts のエージェント向け RLS）が適用されているか確認してください。
                <span className="mt-2 block font-mono text-xs font-normal opacity-90">{fetchError}</span>
            </div>
        )
    }

    const header = (
        <div className="border-b border-slate-100 px-4 py-4 sm:px-8">
            <h3 className="text-base font-black text-navy-secondary sm:text-lg">プロフィールからの問い合わせ</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
                あなたのエージェント公開ページのフォームから届いた連絡です。返信・対応が終わったら「対応済」にチェックしてください。
            </p>
        </div>
    )

    if (rows.length === 0) {
        return (
            <>
                {header}
                <div className="p-12 text-center text-sm font-bold text-slate-400">
                    プロフィールページのフォームからの問い合わせはまだありません
                </div>
            </>
        )
    }

    return (
        <>
            {header}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <th className="px-4 py-3 whitespace-nowrap">日時</th>
                        <th className="px-4 py-3 min-w-[200px]">お客様（フォーム）</th>
                        <th className="px-4 py-3 min-w-[240px]">内容</th>
                        <th className="px-4 py-3 whitespace-nowrap text-center">対応済</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50 align-top hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                                {r.created_at ? format(new Date(r.created_at), 'yyyy/MM/dd HH:mm') : '—'}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-start gap-2">
                                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                    <div className="min-w-0">
                                        <div className="font-bold text-navy-secondary">{r.customer_name}</div>
                                        <a
                                            href={`mailto:${r.customer_email}`}
                                            className="mt-0.5 flex items-center gap-1 text-[11px] text-navy-primary hover:underline break-all"
                                        >
                                            <Mail className="h-3 w-3 shrink-0" aria-hidden />
                                            {r.customer_email}
                                        </a>
                                        <a
                                            href={`tel:${r.customer_phone}`}
                                            className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600 hover:underline"
                                        >
                                            <Phone className="h-3 w-3 shrink-0" aria-hidden />
                                            {r.customer_phone}
                                        </a>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-md">
                                <div className="flex gap-2">
                                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                                        {r.message}
                                    </p>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                                    <span className="sr-only">対応済み</span>
                                    {pendingId === r.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-navy-primary" aria-hidden />
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={r.is_handled}
                                            onChange={(e) => void toggleHandled(r.id, e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    )}
                                    <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">
                                        {r.is_handled ? '済' : '未'}
                                    </span>
                                </label>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    )
}
