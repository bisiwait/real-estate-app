"use client";
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Crown, Loader2, PlusCircle, LayoutDashboard, FileText, Languages, Building2, ArrowRight } from 'lucide-react'

function SuccessContent() {
    const searchParams = useSearchParams()
    const params = useParams()
    const locale = (params.locale as string) || 'jp'
    const sessionId = searchParams.get('session_id')

    const [status, setStatus] = useState<'loading' | 'ready'>('loading')

    useEffect(() => {
        // 簡易的な読み込み演出
        const timer = setTimeout(() => setStatus('ready'), 500)
        return () => clearTimeout(timer)
    }, [])

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* 装飾的なヘッダーアクセント */}
                <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />
                
                <div className="p-8 sm:p-16 text-center">
                    {/* アイコンセクション */}
                    <div className="relative inline-flex mb-8">
                        <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse" />
                        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-100">
                            <CheckCircle2 className="w-12 h-12 text-blue-600" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-full shadow-lg border-2 border-white">
                            <Crown className="w-5 h-5" />
                        </div>
                    </div>

                    {/* テキストセクション */}
                    <div className="space-y-4 mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-[0.15em] border border-blue-100">
                            Pro Plan Activated
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            プロプラン・エージェントへようこそ！
                        </h1>
                        <p className="text-slate-500 text-base sm:text-lg font-medium leading-relaxed max-w-lg mx-auto">
                            パタヤ・シラチャでの成約を加速させる<br className="hidden sm:block" />
                            強力なツールがすべて利用可能になりました。
                        </p>
                    </div>

                    {/* 特典リスト */}
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 mb-12 text-left space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Unlocked Features</h3>
                        
                        <div className="grid gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                    <Languages className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="font-black text-slate-900">3ヶ国語自動翻訳 (日・泰・英)</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">日本人・タイ人・欧米人すべてにアプローチ可能。</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="font-black text-slate-900">プレセール物件の掲載</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">最新のコンドミニアム情報をいち早く発信。</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span className="font-black text-slate-900">物件資料のPDF出力</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">顧客へそのまま渡せるプロ仕様の紹介資料をワンクリックで生成。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex flex-col gap-4">
                        <Link
                            href={`/${locale}/dashboard`}
                            className="group flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            物件管理画面へ進む
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                        </Link>
                        <Link
                            href={`/${locale}/list-property`}
                            className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-lg border-2 border-slate-100 transition-all shadow-sm hover:border-slate-200"
                        >
                            <PlusCircle className="w-6 h-6 text-slate-400" />
                            さっそく新規物件を登録する
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
