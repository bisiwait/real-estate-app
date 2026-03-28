'use client'

import React, { useState } from 'react'
import { Crown, AlertCircle, ArrowRight, ExternalLink, Loader2, CalendarX2 } from 'lucide-react'
import Link from 'next/link'
import { differenceInDays, parseISO, format } from 'date-fns'

interface SubscriptionStatusProps {
    profile: any
    locale?: string
}

export default function SubscriptionStatus({ profile, locale = 'jp' }: SubscriptionStatusProps) {
    const [portalLoading, setPortalLoading] = useState(false)
    const [portalError, setPortalError] = useState<string | null>(null)

    if (!profile || (profile.plan_type !== 'premium' && profile.plan !== 'premium') || !profile.current_period_end) {
        return null
    }

    const expiryDate = parseISO(profile.current_period_end)
    const today = new Date()
    const daysRemaining = differenceInDays(expiryDate, today)
    const formattedExpiryDate = format(expiryDate, 'yyyy/MM/dd')

    const isExpired = daysRemaining < 0
    const isCrisis = daysRemaining <= 3
    // auto_renew が false = 解約予約済み（cancel_at_period_end=true）
    const isCancelScheduled = profile.auto_renew === false && !isExpired

    const bgColor = isExpired ? 'bg-red-50' : isCrisis ? 'bg-orange-50' : 'bg-white'
    const borderColor = isExpired ? 'border-red-200' : isCrisis ? 'border-orange-200' : 'border-slate-100'
    const iconBg = isExpired ? 'bg-red-500' : isCrisis ? 'bg-orange-500' : 'bg-amber-400'

    const handleOpenPortal = async () => {
        setPortalLoading(true)
        setPortalError(null)
        try {
            const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
            const data = await res.json() as { url?: string; error?: string }
            if (!res.ok || !data.url) throw new Error(data.error || 'ポータルURLを取得できませんでした。')
            window.location.href = data.url
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setPortalError(msg)
        } finally {
            setPortalLoading(false)
        }
    }

    return (
        <div className={`rounded-3xl p-6 border ${borderColor} ${bgColor} shadow-xl mb-6 transition-all hover:shadow-2xl group`}>
            <div className="flex items-start justify-between mb-6">
                <div className={`p-2.5 rounded-2xl ${iconBg} text-white shadow-lg shadow-amber-200/50`}>
                    {isExpired ? <AlertCircle className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                    {isExpired ? 'Expired' : isCancelScheduled ? 'Cancelling' : 'Premium Active'}
                </span>
            </div>

            <div className="space-y-2 mb-6">
                <h3 className={`text-xl font-black ${isExpired ? 'text-red-600' : 'text-navy-secondary'}`}>
                    {isExpired ? 'プラン期限切れ' : 'プレミアムプラン利用中'}
                </h3>

                {/* 解約予約済み: 目立つ通知を表示 */}
                {isCancelScheduled ? (
                    <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                        <CalendarX2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-700 leading-relaxed">
                            {formattedExpiryDate} にフリープランへ戻ります
                            <span className="block text-[10px] font-medium text-amber-600 mt-0.5">
                                解約予約済み — それまでは全機能をご利用いただけます
                            </span>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-500">
                            {isExpired
                                ? '機能制限を解除するにはプランの更新が必要です。'
                                : `無料トライアル中（次回請求: ${formattedExpiryDate}）`}
                        </p>
                        {!isExpired && (
                            <p className="text-[10px] font-medium text-blue-600/70">
                                ※期間内に解約すれば料金はかかりません
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* エラー表示 */}
            {portalError && (
                <p className="mb-3 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {portalError}
                </p>
            )}

            {isExpired ? (
                <Link
                    href={`/${locale}/pricing`}
                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                    <span>プランを再開する</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
            ) : (
                <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                        isCrisis
                            ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
                            : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                    {portalLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>処理中...</span>
                        </>
                    ) : (
                        <>
                            <span>プランの管理・解約</span>
                            <ExternalLink className="w-4 h-4" />
                        </>
                    )}
                </button>
            )}
        </div>
    )
}
