'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, Mail, User, Phone, MessageSquare } from 'lucide-react'

type Row = {
    id: string
    agent_id: string
    customer_name: string
    customer_email: string
    customer_phone: string
    message: string
    is_handled: boolean
    created_at: string
    agent_full_name: string | null
}

export default function AdminAgentContactsPanel() {
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRows = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/agent-contacts')
            const data = (await res.json().catch(() => ({}))) as { rows?: Row[]; error?: string }
            if (!res.ok) {
                toast.error(data.error || '一覧の取得に失敗しました')
                setRows([])
                return
            }
            setRows(data.rows ?? [])
        } catch {
            toast.error('一覧の取得に失敗しました')
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchRows()
    }, [fetchRows])

    const toggleHandled = async (id: string, next: boolean) => {
        const prev = rows.find((r) => r.id === id)?.is_handled
        setRows((list) => list.map((r) => (r.id === id ? { ...r, is_handled: next } : r)))
        try {
            const res = await fetch('/api/admin/agent-contacts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_handled: next }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) {
                setRows((list) => list.map((r) => (r.id === id ? { ...r, is_handled: prev ?? false } : r)))
                toast.error(data.error || '更新に失敗しました')
                return
            }
            toast.success('保存しました')
        } catch {
            setRows((list) => list.map((r) => (r.id === id ? { ...r, is_handled: prev ?? false } : r)))
            toast.error('更新に失敗しました')
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-100 bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-navy-primary" aria-hidden />
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-black text-navy-secondary">エージェントページお問い合わせ</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                    エージェント詳細ページのフォームから届いた問い合わせです。対応が完了したら「対応済」にチェックしてください。
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <th className="px-4 py-3 whitespace-nowrap">日時</th>
                            <th className="px-4 py-3 whitespace-nowrap">顧客名</th>
                            <th className="px-4 py-3 whitespace-nowrap">対象エージェント</th>
                            <th className="px-4 py-3 min-w-[200px]">内容</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">対応済</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-sm font-bold text-slate-400">
                                    まだ問い合わせはありません
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id} className="border-b border-slate-50 align-top hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                                        {r.created_at
                                            ? format(new Date(r.created_at), 'yyyy/MM/dd HH:mm')
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-start gap-2">
                                            <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                            <div className="min-w-0">
                                                <div className="font-bold text-navy-secondary">{r.customer_name}</div>
                                                <a
                                                    href={`mailto:${r.customer_email}`}
                                                    className="mt-0.5 flex items-center gap-1 text-[11px] text-navy-primary hover:underline"
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
                                    <td className="px-4 py-3 text-xs font-bold text-navy-secondary">
                                        {r.agent_full_name || '（不明）'}
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
                                            <input
                                                type="checkbox"
                                                checked={r.is_handled}
                                                onChange={(e) => toggleHandled(r.id, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-[9px] font-black uppercase tracking-tight text-slate-400">
                                                {r.is_handled ? '済' : '未'}
                                            </span>
                                        </label>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
