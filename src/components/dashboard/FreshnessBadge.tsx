'use client'

import { Clock, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

interface FreshnessBadgeProps {
    lastConfirmedAt: string | null
    createdAt: string
}

export default function FreshnessBadge({ lastConfirmedAt, createdAt }: FreshnessBadgeProps) {
    const dateToUse = lastConfirmedAt || createdAt
    const lastDate = new Date(dateToUse)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - lastDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 最終更新（確認）から7日以内：「新着/確認済み」（緑色のバッジ）
    if (diffDays <= 7) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <CheckCircle2 size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">新着/確認済み</span>
            </div>
        )
    }

    // 14日以上経過：「要確認」（黄色のバッジ）
    if (diffDays >= 14 && diffDays < 30) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 animate-in fade-in zoom-in duration-300">
                <AlertTriangle size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">要確認</span>
            </div>
        )
    }

    // 30日以上経過：「期限切れ間近/非公開」（赤色のバッジ）
    if (diffDays >= 30) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 animate-in fade-in zoom-in duration-300">
                <AlertCircle size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">期限切れ間近/非公開</span>
            </div>
        )
    }

    // Between 7 and 14 days - Optional: Stable status or just default badge
    return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-100 animate-in fade-in zoom-in duration-300">
            <Clock size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">掲載中</span>
        </div>
    )
}
