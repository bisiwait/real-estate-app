'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Crown, Building2, Sparkles, FileText, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react'

interface PremiumPromoCardProps {
    plan?: string
}

export default function PremiumPromoCard({ plan }: PremiumPromoCardProps) {
    const params = useParams()
    const isPremium = plan === 'premium'

    // If already premium, we could show a "Premium Active" subtle card or nothing.
    // The user asked for a promo/explanation, so if already premium, we can show a summary of their benefits.

    return (
        <div className={`overflow-hidden rounded-3xl border shadow-xl transition-all duration-300 ${isPremium
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-100'
            }`}>
            {/* Header */}
            <div className={`p-5 flex items-center gap-3 ${isPremium ? 'bg-white/5' : 'bg-amber-500/5'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${isPremium ? 'bg-amber-500 text-slate-900' : 'bg-white text-amber-500'
                    }`}>
                    <Crown className="w-5 h-5 font-bold" />
                </div>
                <div>
                    <h3 className={`text-sm font-black tracking-tight ${isPremium ? 'text-amber-400' : 'text-amber-900'}`}>
                        {isPremium ? 'PREMIUM ACTIVE' : 'PREMIUM PLAN'}
                    </h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremium ? 'text-slate-400' : 'text-amber-700/60'}`}>
                        Exclusive Benefits
                    </p>
                </div>
            </div>

            {/* Features List */}
            <div className="p-5 space-y-4">
                <p className={`text-[10px] font-bold leading-relaxed ${isPremium ? 'text-slate-400' : 'text-amber-900/80'}`}>
                    （プレセール物件掲載、AI自動翻訳・紹介文、高品質PDF出力）
                </p>
                <div className="space-y-3">
                    <BenefitItem
                        icon={<Building2 className="w-4 h-4" />}
                        title="プレセール物件掲載"
                        description="一般非公開の先行販売物件を掲載可能"
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<Sparkles className="w-4 h-4" />}
                        title="AI自動翻訳・紹介文"
                        description="3ヶ国語の紹介文をAIが自動生成"
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<FileText className="w-4 h-4" />}
                        title="高品質PDF出力"
                        description="プロ仕様の販売チラシを1クリック作成"
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<MessageCircle className="w-4 h-4" />}
                        title="LINE問い合わせ"
                        description="LINEからの問い合わせを受け取れます"
                        isPremium={isPremium}
                    />
                </div>

                {isPremium ? (
                    <div className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-xs font-black text-amber-400">
                            無料トライアル期間中
                        </p>
                    </div>
                ) : (
                    <Link
                        href={`/${params.locale}/pricing`}
                        className="group mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-200 active:scale-[0.98]"
                    >
                        有料プランに移行
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                )}
            </div>
        </div>
    )
}

function BenefitItem({ icon, title, description, isPremium }: { icon: React.ReactNode, title: string, description: string, isPremium: boolean }) {
    return (
        <div className="flex gap-3 items-start">
            <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isPremium ? 'bg-white/10 text-amber-400' : 'bg-amber-100 text-amber-600'
                }`}>
                {icon}
            </div>
            <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold ${isPremium ? 'text-white' : 'text-amber-950'}`}>{title}</span>
                    {isPremium && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <p className={`text-[9.5px] leading-relaxed ${isPremium ? 'text-slate-400' : 'text-amber-800/70'}`}>
                    {description}
                </p>
            </div>
        </div>
    )
}
