'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Star } from 'lucide-react'

export default function PricingSection() {
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'standard' | 'premium'>('standard')

    return (
        <div id="plans" className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-black text-navy-secondary mb-4">ビジネスの規模に合わせた料金プラン</h2>
                <p className="text-slate-500 font-medium">初期費用ゼロ。あなたのポートフォリオに最適なプランをお選びください。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                {/* Free Plan */}
                <div
                    onClick={() => setSelectedPlan('free')}
                    className={`bg-white rounded-[2rem] p-8 shadow-lg cursor-pointer transition-all duration-300 ${selectedPlan === 'free' ? 'border-4 border-navy-primary transform md:-translate-y-2' : 'border border-slate-200'}`}
                >
                    <h3 className="text-2xl font-black text-navy-secondary mb-2">フリー</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">まずはお試しで始めたい方へ</p>
                    <div className="mb-8 border-b border-slate-100 pb-8">
                        <span className="text-5xl font-black text-navy-secondary">0</span>
                        <span className="text-slate-400 font-bold ml-2">THB / 月</span>
                    </div>
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-bold">最大 <span className="text-navy-secondary">3件</span> まで掲載可能</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-medium">基本的な物件登録機能</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-medium">直接のお問い合わせ受信</span>
                        </li>
                    </ul>
                    <Link href="/register?plan=free" className={`block w-full text-center font-black py-4 rounded-xl transition-colors ${selectedPlan === 'free' ? 'bg-navy-primary text-white hover:bg-blue-600 shadow-md' : 'bg-slate-100 text-navy-secondary hover:bg-slate-200'}`}>
                        このプランで始める
                    </Link>
                </div>

                {/* Standard Plan (Popular) */}
                <div
                    onClick={() => setSelectedPlan('standard')}
                    className={`bg-white rounded-[2.5rem] p-8 shadow-2xl relative cursor-pointer transition-all duration-300 ${selectedPlan === 'standard' ? 'border-4 border-navy-primary transform md:-translate-y-4' : 'border border-slate-200 transform md:-translate-y-2'}`}
                >
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="bg-navy-primary text-white text-sm font-black uppercase tracking-widest py-1.5 px-4 rounded-full flex items-center shadow-lg">
                            <Star className="w-4 h-4 mr-1 text-amber-300" fill="currentColor" />
                            Most Popular
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-navy-secondary mb-2">スタンダード</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">本格的に集客をスケールさせたい方へ</p>
                    <div className="mb-8 border-b border-slate-100 pb-8">
                        <span className="text-5xl font-black text-navy-secondary">1,500</span>
                        <span className="text-slate-400 font-bold ml-2">THB / 月</span>
                        <div className="mt-3 inline-block bg-amber-50 border border-amber-200 text-amber-600 text-xs font-black px-3 py-1 rounded-full">
                            OPEN記念：最初の3ヶ月無料！
                        </div>
                    </div>
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-navy-primary flex-shrink-0 mr-3" />
                            <span className="text-slate-600 font-bold">掲載件数 <span className="text-navy-primary">無制限</span></span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-navy-primary flex-shrink-0 mr-3" />
                            <span className="text-slate-600 font-medium">AI自動入力・日本語翻訳支援</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-navy-primary flex-shrink-0 mr-3" />
                            <span className="text-slate-600 font-medium">物件の優先表示設定</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-navy-primary flex-shrink-0 mr-3" />
                            <span className="text-slate-600 font-medium">詳細なアクセス解析データ</span>
                        </li>
                    </ul>
                    <Link href="/register?plan=standard" className={`block w-full text-center font-black py-4 rounded-xl transition-all ${selectedPlan === 'standard' ? 'bg-navy-primary text-white hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5' : 'bg-slate-100 text-navy-secondary hover:bg-slate-200'}`}>
                        このプランで始める
                    </Link>
                </div>

                {/* Premium Plan */}
                <div
                    onClick={() => setSelectedPlan('premium')}
                    className={`bg-white rounded-[2rem] p-8 shadow-lg cursor-pointer transition-all duration-300 ${selectedPlan === 'premium' ? 'border-4 border-navy-primary transform md:-translate-y-2' : 'border border-slate-200'}`}
                >
                    <h3 className="text-2xl font-black text-navy-secondary mb-2">プレミアム</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">デベロッパー・大手エージェント様へ</p>
                    <div className="mb-8 border-b border-slate-100 pb-8">
                        <span className="text-5xl font-black text-navy-secondary">3,000</span>
                        <span className="text-slate-400 font-bold ml-2">THB / 月</span>
                    </div>
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-bold"><span className="text-amber-500">プレセール物件</span> 掲載権</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-medium">トップページ検索上位確約</span>
                        </li>
                        <li className="flex items-start">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-slate-600 font-medium">バナー広告優待枠</span>
                        </li>
                    </ul>
                    <Link href="/register?plan=premium" className={`block w-full text-center font-black py-4 rounded-xl transition-colors ${selectedPlan === 'premium' ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-md' : 'bg-slate-100 text-navy-secondary hover:bg-slate-200'}`}>
                        このプランで始める
                    </Link>
                </div>
            </div>
        </div>
    )
} 
