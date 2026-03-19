'use client'

import { useState } from 'react'
import { CreditCard, RefreshCcw, Loader2, Infinity } from 'lucide-react'
import Link from 'next/link'
import { isPremium } from '@/lib/utils/plan'

interface CreditSectionProps {
    profile: any
}

export default function CreditSection({ profile }: CreditSectionProps) {
    const [credits, setCredits] = useState(profile?.available_credits || 0)
    const [loading, setLoading] = useState(false)
    const isPremiumStatus = isPremium(profile)
    const isStandard = profile?.plan === 'standard' || profile?.plan_type === 'standard'

    const handleSync = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/dev/sync-credits', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setCredits(data.credits)
            } else {
                alert('Sync failed: ' + (data.error || 'Unknown error'))
            }
        } catch (err) {
            alert('Error: ' + err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 ${isPremiumStatus ? 'bg-gradient-to-br from-slate-900 via-navy-primary to-slate-900 border border-amber-500/20' : 'bg-navy-primary'}`}>
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500 group-hover:scale-110">
                {isPremiumStatus ? <Infinity className="w-32 h-32" /> : <CreditCard className="w-32 h-32" />}
            </div>
            <div className="flex justify-between items-start mb-1 relative z-10">
                <div className="flex flex-col items-start gap-1.5">
                    <p className="text-sm font-medium text-white/60">
                        {isPremiumStatus ? '掲載ステータス' : '現在の保有クレジット'}
                    </p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isPremiumStatus ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20' :
                        isStandard ? 'bg-indigo-500 text-white shadow-sm' :
                            'bg-slate-500 text-white shadow-sm'
                        } uppercase tracking-wider`}>
                        {isPremiumStatus ? 'プレミアム' : isStandard ? 'スタンダード' : 'フリー'}プラン
                    </span>
                </div>
                {!isPremiumStatus && (
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white flex items-center space-x-1"
                        title="テストクレジットを同期 (デベロッパー用)"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        <span className="text-[10px] font-bold">Sync Test</span>
                    </button>
                )}
            </div>

            {isPremiumStatus ? (
                <div className="mt-2 mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <Infinity className="w-10 h-10 text-amber-400" />
                        <h2 className="text-3xl font-black !text-white leading-none">
                            物件掲載：無制限
                        </h2>
                    </div>
                    <p className="text-[11px] font-bold text-amber-400/60 mt-2 uppercase tracking-widest ml-1">Unlimited Listings</p>
                </div>
            ) : (
                <>
                    <h2 className="text-5xl font-black mb-6 relative z-10 !text-white">
                        {credits}<span className="text-lg ml-2 font-normal !text-white/80">Credits</span>
                    </h2>
                    <Link
                        href="/pricing"
                        className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 text-center py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm relative z-10 text-white"
                    >
                        クレジットを購入する
                    </Link>
                </>
            )}

            <p className="text-[8px] text-white/40 mt-3 text-center uppercase tracking-widest opacity-50 relative z-10">
                {isPremiumStatus ? 'Premium Benefits Active' : 'Local Webhook Bypass active'}
            </p>
        </div>
    )
}
