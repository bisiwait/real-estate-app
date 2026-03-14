export const runtime = 'edge';
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CreditCard, Building2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import PresaleListingForm from '@/components/property/PresaleListingForm'

export default function PresalePropertyPage() {
    const [credits, setCredits] = useState<number | null>(null)
    const [isPremium, setIsPremium] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function checkAccess() {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('available_credits, plan, plan_type')
                .eq('id', user.id)
                .single()

            setCredits(profile?.available_credits || 0)
            setIsPremium(profile?.plan_type === 'premium' || profile?.plan === 'premium')
            setLoading(false)
        }

        checkAccess()
    }, [supabase, router])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-navy-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (isPremium === false) {
        return (
            <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg text-center border border-slate-100">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="text-red-600 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-navy-secondary mb-4">繝励Ξ繝溘い繝励Λ繝ｳ髯仙ｮ壽ｩ溯・縺ｧ縺・/h2>
                    <p className="text-slate-500 mb-10 leading-relaxed">
                        繝励Ξ繧ｻ繝ｼ繝ｫ・域眠遽画兜雉・｡井ｻｶ・峨・謚慕ｨｿ讖溯・縺ｯ縲√・繝ｬ繝溘い繝励Λ繝ｳ繧偵＃蛻ｩ逕ｨ縺ｮ繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝域ｧ倥・縺ｿ隗｣謾ｾ縺輔ｌ縺ｦ縺翫ｊ縺ｾ縺吶・
                    </p>
                    <Link
                        href="/dashboard"
                        className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl"
                    >
                        <span>繝繝・す繝･繝懊・繝峨∈謌ｻ繧・/span>
                    </Link>
                </div>
            </div>
        )
    }

    if (credits !== null && credits <= 0) {
        return (
            <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg text-center border border-slate-100">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="text-amber-600 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-navy-secondary mb-4">謗ｲ霈峨け繝ｬ繧ｸ繝・ヨ縺御ｸ崎ｶｳ縺励※縺・∪縺・/h2>
                    <p className="text-slate-500 mb-10 leading-relaxed">
                        迚ｩ莉ｶ繧呈軸霈峨☆繧九↓縺ｯ縲∽ｺ句燕縺ｫ縲梧軸霈画棧・医け繝ｬ繧ｸ繝・ヨ・峨阪ｒ雉ｼ蜈･縺励※縺・◆縺縺丞ｿ・ｦ√′縺ゅｊ縺ｾ縺吶・
                        迴ｾ蝨ｨ縲√♀螳｢讒倥・菫晄戟繧ｯ繝ｬ繧ｸ繝・ヨ縺ｯ <span className="text-navy-primary font-bold">0</span> 縺ｧ縺吶・
                    </p>
                    <Link
                        href="/pricing"
                        className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl"
                    >
                        <CreditCard className="w-5 h-5" />
                        <span>繝励Λ繝ｳ繧偵メ繧ｧ繝・け縺吶ｋ</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="mt-4 w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <span>繝繝・す繝･繝懊・繝峨∈謌ｻ繧・/span>
                    </Link>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-50 min-h-screen py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 text-slate-400 hover:text-navy-primary font-bold mb-8 transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>繝繝・す繝･繝懊・繝峨↓謌ｻ繧・/span>
                    </Link>

                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Premium</span>
                            </div>
                            <h1 className="text-3xl font-black text-navy-secondary mb-2">繝励Ξ繧ｻ繝ｼ繝ｫ迚ｩ莉ｶ繧呈兜遞ｿ縺吶ｋ</h1>
                            <p className="text-slate-500">譁ｰ遽峨ｄ蟒ｺ險ｭ荳ｭ縺ｮ謚戊ｳ・畑繝励Ο繧ｸ繧ｧ繧ｯ繝域ュ蝣ｱ繧貞・髢九＠縺ｾ縺励ｇ縺・・/p>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3">
                            <Building2 className="text-navy-primary w-5 h-5" />
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">菫晄戟繧ｯ繝ｬ繧ｸ繝・ヨ</div>
                                <div className="text-xl font-black text-navy-primary leading-none">{credits}</div>
                            </div>
                        </div>
                    </div>

                    {/* Presale Listing Form */}
                    <PresaleListingForm />
                </div>
            </div>
        </div>
    )
}
