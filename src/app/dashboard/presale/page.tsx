'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CreditCard, Building2 } from 'lucide-react'
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
                .select('available_credits, plan')
                .eq('id', user.id)
                .single()

            setCredits(profile?.available_credits || 0)
            setIsPremium(profile?.plan === 'premium')
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
                        プレセール（新築投資案件）の投稿機能は、プレミアプランをご利用のエージェント様のみ解放されております。
                    </p>
                    <Link
                        href="/dashboard"
                        className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl"
                    >
                        <span>ダッシュボードへ戻る</span>
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
                    <h2 className="text-2xl font-black text-navy-secondary mb-4">掲載クレジットが不足しています</h2>
                    <p className="text-slate-500 mb-10 leading-relaxed">
                        物件を掲載するには、事前に「掲載枠（クレジット）」を購入していただく必要があります。
                        現在、お客様の保持クレジットは <span className="text-navy-primary font-bold">0</span> です。
                    </p>
                    <Link
                        href="/pricing"
                        className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl"
                    >
                        <CreditCard className="w-5 h-5" />
                        <span>プランをチェックする</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="mt-4 w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <span>ダッシュボードへ戻る</span>
                    </Link>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-50 min-h-screen py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Premium</span>
                            </div>
                            <h1 className="text-3xl font-black text-navy-secondary mb-2">プレセール物件を投稿する</h1>
                            <p className="text-slate-500">新築や建設中の投資用プロジェクト情報を公開しましょう。</p>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3">
                            <Building2 className="text-navy-primary w-5 h-5" />
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">保持クレジット</div>
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
