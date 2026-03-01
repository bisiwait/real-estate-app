'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface AgentStatusTogglesProps {
    propertyId: string
    currentStatus: string
}

export default function AgentStatusToggles({ propertyId, currentStatus }: AgentStatusTogglesProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // We only show toggles if the property is published, under negotiation, or contracted.
    const canToggle = ['published', 'under_negotiation', 'contracted'].includes(currentStatus)

    if (!canToggle) return null

    const handleToggle = async (targetStatus: 'under_negotiation' | 'contracted') => {
        setLoading(true)
        try {
            // If the current status is the target, turning it OFF means going back to 'published'.
            // If it's different, turning it ON means changing to targetStatus.
            const newStatus = currentStatus === targetStatus ? 'published' : targetStatus

            const { error } = await supabase
                .from('properties')
                .update({ status: newStatus })
                .eq('id', propertyId)

            if (error) {
                alert('ステータスの更新に失敗しました: ' + error.message)
            } else {
                router.refresh()
            }
        } catch (err: any) {
            alert('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const isNegotiationOn = currentStatus === 'under_negotiation'
    const isContractedOn = currentStatus === 'contracted'

    return (
        <div className="flex items-center space-x-2 ml-2">
            {loading ? (
                <div className="px-2 py-0.5 flex items-center">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                </div>
            ) : (
                <>
                    <button
                        onClick={() => handleToggle('under_negotiation')}
                        disabled={loading}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center ${isNegotiationOn
                                ? 'bg-blue-500 text-white border-blue-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                        title="クリックして商談中のON/OFFを切り替え"
                    >
                        商談中: {isNegotiationOn ? 'ON' : 'OFF'}
                    </button>
                    <button
                        onClick={() => handleToggle('contracted')}
                        disabled={loading}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center ${isContractedOn
                                ? 'bg-purple-500 text-white border-purple-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                        title="クリックして成約済みのON/OFFを切り替え"
                    >
                        成約済: {isContractedOn ? 'ON' : 'OFF'}
                    </button>
                </>
            )}
        </div>
    )
}
