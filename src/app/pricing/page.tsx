'use client'

import { useState } from 'react'
import { Check, Zap, Shield, Crown } from 'lucide-react'

const PACKAGES = [
    {
        id: 'lite',
        name: 'ライトプラン',
        price: 500,
        credits: 10,
        description: 'まずは試してみたい方に最適',
        color: 'slate',
        icon: Zap,
        popular: false
    },
    {
        id: 'standard',
        name: 'スタンダードプラン',
        price: 3500,
        credits: 100,
        description: '最も人気のあるパッケージ',
        color: 'navy',
        icon: Shield,
        popular: true
    },
    {
        id: 'pro',
        name: 'プロプラン',
        price: 20000,
        credits: 1000,
        description: '大規模な導入をご検討の方に',
        color: 'emerald',
        icon: Crown,
        popular: false
    }
]

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handlePurchase = async (pkgId: string) => {
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
                        物件を掲載するための「掲載枠（クレジット）」を事前に購入していただくパッケージ制を採用しています。
                        1クレジットにつき1つの物件を公開できます。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`relative bg-white rounded-3xl p-8 shadow-xl transition-all hover:-translate-y-2 border-2 ${pkg.popular ? 'border-navy-primary' : 'border-transparent'}`}
                        >
                            {pkg.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-navy-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8">
                                <div className={`p-3 rounded-2xl ${pkg.id === 'standard' ? 'bg-navy-primary/10 text-navy-primary' : 'bg-slate-100 text-slate-500'}`}>
                                    <pkg.icon className="w-8 h-8" />
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-navy-secondary">¥{pkg.price.toLocaleString()}</div>
                                    <div className="text-xs font-bold text-slate-400">税込</div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-navy-secondary mb-2">{pkg.name}</h3>
                            <p className="text-sm text-slate-500 mb-8 h-10">{pkg.description}</p>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center text-navy-secondary">
                                    <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full mr-3">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm font-bold">{pkg.credits} 掲載クレジット付与</span>
                                </div>
                                <div className="flex items-center text-slate-600">
                                    <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full mr-3">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm font-medium">1件あたり {Math.round(pkg.price / pkg.credits)}円</span>
                                </div>
                                <div className="flex items-center text-slate-600">
                                    <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full mr-3">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <span className="text-sm font-medium">無期限で利用可能</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading !== null}
                                className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${pkg.popular ? 'bg-navy-primary text-white hover:bg-navy-secondary' : 'bg-slate-100 text-navy-secondary hover:bg-slate-200'}`}
                            >
                                {loading === pkg.id ? (
                                    <div className="w-5 h-5 border-2 border-navy-primary/30 border-t-navy-primary rounded-full animate-spin"></div>
                                ) : (
                                    <span>このプランを選択する</span>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center text-slate-400 text-sm max-w-2xl mx-auto">
                    <p>
                        ※1クレジットにつき1つの物件を掲載（公開）できます。一度消費されたクレジットは返金できません。<br />
                        ※掲載期限は各物件の投稿から30日間です。期間を延長する場合は再度クレジットが必要になります。
                    </p>
                </div>
            </div>
        </div>
    )
}
