"use client";
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import PresaleListingForm from '@/components/property/PresaleListingForm'
import { isPremiumActive } from '@/lib/utils/plan'

export default function PresalePropertyPage() {
    const params = useParams()
    const locale = (params?.locale as string) || 'jp'
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
                .select('plan, plan_type, current_period_end, is_admin')
                .eq('id', user.id)
                .single()

            setIsPremium(isPremiumActive(profile))
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
                    <h2 className="text-2xl font-black text-navy-secondary mb-4">プレミアプラン限定機能です</h2>
                    <p className="text-slate-500 mb-10 leading-relaxed">
                        プレセール（新築投資案件）の投稿機能は、契約有効なプレミアムプランのエージェント様のみご利用いただけます。プランの更新は料金ページからどうぞ。
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link
                            href={`/${locale}/pricing`}
                            className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-amber-600 transition-all shadow-lg"
                        >
                            <span>料金・プランを見る</span>
                        </Link>
                        <Link
                            href={`/${locale}/dashboard`}
                            className="w-full border-2 border-slate-200 bg-white text-navy-secondary py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all"
                        >
                            <span>ダッシュボードへ戻る</span>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-50 min-h-screen py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={`/${locale}/dashboard`}
                        className="inline-flex items-center space-x-2 text-slate-400 hover:text-navy-primary font-bold mb-8 transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>ダッシュボードに戻る</span>
                    </Link>

                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Premium</span>
                            </div>
                            <h1 className="text-3xl font-black text-navy-secondary mb-2">プレセール物件を投稿する</h1>
                            <p className="text-slate-500">新築や建設中の投資用プロジェクト情報を公開しましょう。</p>
                        </div>
                    </div>

                    <PresaleListingForm />
                </div>
            </div>
        </div>
    )
}
