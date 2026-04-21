'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Crown, Building2, Sparkles, FileText, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react'

interface PremiumPromoCardProps {
    plan?: string
    dict: any
}

export default function PremiumPromoCard({ plan, dict }: PremiumPromoCardProps) {
    const params = useParams()
    const isPremium = plan === 'premium'

    // If already on Pro (DB: premium), show active summary or promo for free users.
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
                        {isPremium ? dict.pro_active_label : dict.pro_plan_label}
                    </h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremium ? 'text-slate-400' : 'text-amber-700/60'}`}>
                        {dict.pro_exclusive_benefits}
                    </p>
                </div>
            </div>

            {/* Features List */}
            <div className="p-5 space-y-4">
                <p className={`text-[10px] font-bold leading-relaxed ${isPremium ? 'text-slate-400' : 'text-amber-900/80'}`}>
                    {dict.pro_benefits_summary}
                </p>
                <div className="space-y-3">
                    <BenefitItem
                        icon={<Building2 className="w-4 h-4" />}
                        title={dict.pro_benefit_presale_title}
                        description={dict.pro_benefit_presale_desc}
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<Sparkles className="w-4 h-4" />}
                        title={dict.pro_benefit_ai_title}
                        description={dict.pro_benefit_ai_desc}
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<FileText className="w-4 h-4" />}
                        title={dict.pro_benefit_pdf_title}
                        description={dict.pro_benefit_pdf_desc}
                        isPremium={isPremium}
                    />
                    <BenefitItem
                        icon={<MessageCircle className="w-4 h-4" />}
                        title={dict.pro_benefit_line_title}
                        description={dict.pro_benefit_line_desc}
                        isPremium={isPremium}
                    />
                </div>

                {isPremium ? (
                    <div className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{dict.pro_status_label}</p>
                        <p className="text-xs font-black text-amber-400">
                            {dict.pro_status_trial}
                        </p>
                    </div>
                ) : (
                    <Link
                        href={`/${params.locale}/pricing`}
                        className="group mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-200 active:scale-[0.98]"
                    >
                        {dict.pro_upgrade_cta}
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
