'use client'

import Link from 'next/link'
import { Infinity, Sparkles } from 'lucide-react'
import { isPremium } from '@/lib/utils/plan'

interface CreditSectionProps {
    profile: any
}

/** ダッシュボード用プラン表示（掲載クレジットの数値は表示しない） */
export default function CreditSection({ profile }: CreditSectionProps) {
    const isPremiumStatus = isPremium(profile)
    const isStandard = profile?.plan === 'standard' || profile?.plan_type === 'standard'

    return (
        <div
            className={`text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 ${
                isPremiumStatus
                    ? 'bg-gradient-to-br from-slate-900 via-navy-primary to-slate-900 border border-amber-500/20'
                    : 'bg-navy-primary'
            }`}
        >
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500 group-hover:scale-110">
                {isPremiumStatus ? <Infinity className="w-32 h-32" /> : <Sparkles className="w-32 h-32" />}
            </div>
            <div className="flex flex-col items-start gap-1.5 mb-4 relative z-10">
                <p className="text-sm font-medium text-white/60">ご利用中のプラン</p>
                <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        isPremiumStatus
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20'
                            : isStandard
                              ? 'bg-indigo-500 text-white shadow-sm'
                              : 'bg-slate-500 text-white shadow-sm'
                    } uppercase tracking-wider`}
                >
                    {isPremiumStatus ? 'プレミアム' : isStandard ? 'スタンダード' : 'フリー'}プラン
                </span>
            </div>

            {isPremiumStatus ? (
                <div className="mt-2 mb-2 relative z-10">
                    <div className="flex items-center gap-3">
                        <Infinity className="w-10 h-10 text-amber-400 shrink-0" />
                        <h2 className="text-2xl sm:text-3xl font-black !text-white leading-tight">
                            物件掲載：無制限
                        </h2>
                    </div>
                    <p className="text-[11px] font-bold text-amber-400/60 mt-2 uppercase tracking-widest ml-1">
                        Unlimited Listings
                    </p>
                </div>
            ) : (
                <div className="relative z-10 space-y-4">
                    <p className="text-sm font-medium text-white/85 leading-relaxed">
                        このプランで物件の掲載・編集・お問い合わせ管理ができます。上部の「物件を新規掲載する」から登録してください。
                    </p>
                    <Link
                        href="/pricing"
                        className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 text-center py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm text-white"
                    >
                        上位プランを見る
                    </Link>
                </div>
            )}
        </div>
    )
}
