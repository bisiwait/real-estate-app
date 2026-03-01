'use client'

import { useState } from 'react'
import { Check, Zap, Shield, Crown } from 'lucide-react'

const PACKAGES = [
    {
        id: 'free',
        name: 'フリープラン',
        price: 0,
        priceText: '無料',
        credits: '3',
        description: '新規登録時の基本プラン',
        color: 'slate',
        icon: Zap,
        popular: false,
        features: [
            '3クレジット付与',
            '無期限で利用可能',
            '基本機能へのアクセス'
        ]
    },
    {
        id: 'standard',
        name: 'スタンダードプラン',
        price: 1500,
        priceText: '1,500 THB / 月',
        credits: '100',
        description: '本格的に物件を掲載したい方に',
        color: 'navy',
        icon: Shield,
        popular: true,
        features: [
            '100クレジット付与',
            '無期限で利用可能',
            '優先的なサポート'
        ]
    },
    {
        id: 'premium',
        name: 'プレミアムプラン',
        price: 4000,
        priceText: '4,000 THB / 月',
        credits: '無制限',
        description: '最大限の露出と効果を求める方に',
        color: 'emerald',
        icon: Crown,
        popular: false,
        features: [
            '無制限クレジット',
            '検索結果の上位表示',
            '専任サポート'
        ]
    }
]

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<string>('free')

    const handlePurchase = async (pkgId: string) => {
        if (pkgId === 'free') return // フリープランは購入処理不要

        setLoading(pkgId)
        // Here we will call our API to create a Stripe Checkout Session
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId: pkgId })
            })
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (err) {
            console.error('Purchase error:', err)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="bg-slate-50 min-h-screen py-20">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl font-black text-navy-secondary mb-4">掲載プランの選択</h1>
                    <p className="text-slate-600">
                        お客様のニーズに合わせた3つのプランをご用意しています。<br />
                        まずはフリープランからお試しいただけます。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            onClick={() => setSelectedPlan(pkg.id)}
                            className={`relative bg-white rounded-3xl p-8 shadow-xl transition-all cursor-pointer border-4 duration-300 ${selectedPlan === pkg.id ? 'border-navy-primary transform md:-translate-y-4' : 'border-transparent hover:-translate-y-2'}`}
                        >
                            {pkg.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-navy-primary text-white text-[10px] font-black px-6 py-1.5 rounded-full tracking-widest uppercase shadow-md">
                                    おすすめ
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8">
                                <div className={`p-4 rounded-2xl ${pkg.popular ? 'bg-navy-primary/10 text-navy-primary' : 'bg-slate-50 text-slate-500'}`}>
                                    <pkg.icon className="w-8 h-8" />
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl md:text-3xl font-black text-navy-secondary">{pkg.priceText}</div>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-navy-secondary mb-3">{pkg.name}</h3>
                            <p className="text-sm font-medium text-slate-500 mb-8 h-10">{pkg.description}</p>

                            <div className="space-y-4 mb-10">
                                {pkg.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center text-slate-700">
                                        <div className="bg-emerald-100/50 text-emerald-600 p-1.5 rounded-full mr-4 flex-shrink-0">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm font-bold">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePurchase(pkg.id)
                                }}
                                disabled={loading !== null || pkg.id === 'free'}
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 
                                    ${pkg.id === 'free'
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : selectedPlan === pkg.id
                                            ? 'bg-navy-primary text-white hover:bg-navy-secondary shadow-lg hover:shadow-xl'
                                            : 'bg-slate-100 text-navy-secondary hover:bg-slate-200'
                                    }`}
                            >
                                {loading === pkg.id ? (
                                    <div className="w-5 h-5 border-2 border-navy-primary/30 border-t-navy-primary rounded-full animate-spin"></div>
                                ) : (
                                    <span>{pkg.id === 'free' ? '現在のプラン' : 'このプランで始める'}</span>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center text-slate-400 text-xs md:text-sm max-w-3xl mx-auto space-y-2 font-medium">
                    <p>※1クレジットにつき1つの物件を掲載（公開）できます。</p>
                    <p>※スタンダード・プレミアムプランのご利用料金は、月額での継続課金となります。</p>
                </div>
            </div>
        </div>
    )
}
