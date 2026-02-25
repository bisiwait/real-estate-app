'use client'

import { useState } from 'react'
import { CreditCard, RefreshCcw, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CreditSectionProps {
    initialCredits: number
}

export default function CreditSection({ initialCredits }: CreditSectionProps) {
    const [credits, setCredits] = useState(initialCredits)
    const [loading, setLoading] = useState(false)

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
        <div className="bg-navy-primary text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform duration-500">
                <CreditCard className="w-32 h-32" />
            </div>
            <div className="flex justify-between items-start mb-1 relative z-10">
                <p className="text-sm font-medium text-white/60">現在の保有クレジット</p>
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white flex items-center space-x-1"
                    title="テストクレジットを同期 (デベロッパー用)"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    <span className="text-[10px] font-bold">Sync Test</span>
                </button>
            </div>
            <h2 className="text-5xl font-black mb-6 relative z-10 !text-white">
                {credits}<span className="text-lg ml-2 font-normal !text-white/80">Credits</span>
            </h2>
            <Link
                href="/pricing"
                className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 text-center py-3 rounded-xl text-sm font-bold transition-all backdrop-blur-sm relative z-10 text-white"
            >
                クレジットを購入する
            </Link>
            <p className="text-[8px] text-white/40 mt-3 text-center uppercase tracking-widest opacity-50 relative z-10">Local Webhook Bypass active</p>
        </div>
    )
}
