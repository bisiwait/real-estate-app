'use client'

import React from 'react'
import { Crown, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { differenceInDays, parseISO } from 'date-fns'

interface SubscriptionStatusProps {
    profile: any
}

export default function SubscriptionStatus({ profile }: SubscriptionStatusProps) {
    if (!profile || profile.plan_type !== 'premium' || !profile.current_period_end) {
        return null
    }

    const expiryDate = parseISO(profile.current_period_end)
    const today = new Date()
    const daysRemaining = differenceInDays(expiryDate, today)

    // Check if it's a trial (auto_renew might be true, but let's assume if it has current_period_end it's trial or paid)
    // For this implementation, we'll follow the user's logic: 
    // If they have current_period_end and plan_type is premium, we show status.
    // If they are "paid", they might not have a trial countdown, but let's assume trial for now as requested.

    const isExpired = daysRemaining < 0
    const isCrisis = daysRemaining <= 3
    const isWarning = daysRemaining <= 7

    const statusColor = isExpired ? 'bg-red-500' : isCrisis ? 'bg-orange-500' : 'bg-amber-500'
    const textColor = isExpired ? 'text-red-500' : isCrisis ? 'text-orange-600' : 'text-amber-600'
    const bgColor = isExpired ? 'bg-red-50' : isCrisis ? 'bg-orange-50' : 'bg-amber-50/50'
    const borderColor = isExpired ? 'border-red-200' : isCrisis ? 'border-orange-200' : 'border-amber-200'

    return (
        <div className={`rounded-3xl p-6 border ${borderColor} ${bgColor} shadow-sm mb-6 transition-all hover:shadow-md group`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-2xl ${statusColor} text-white`}>
                    {isExpired ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                {daysRemaining <= 14 && (
                    <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white">
                        Premium Trial
                    </span>
                )}
            </div>

            <div className="space-y-1 mb-6">
                <h3 className={`text-lg font-black ${isExpired ? 'text-red-600' : 'text-navy-secondary'}`}>
                    {isExpired ? 'トライアル期限切れ' : `プレミアム体験中（残り${daysRemaining}日）`}
                </h3>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {isExpired
                        ? '機能制限を解除するにはプランの更新が必要です。'
                        : isCrisis
                            ? '間もなくトライアルが終了します。お早めに有料プランへ！'
                            : '全てのプレミアム機能をご利用いただけます。'}
                </p>
            </div>

            <Link
                href="/pricing"
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isCrisis
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
            >
                <span>{isExpired ? 'プランを再開する' : '有料プランへ移行'}</span>
                <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1`} />
            </Link>
        </div>
    )
}
