'use client'

import { createClient } from '@/lib/supabase/client'
import { Phone, MessageCircle, User, ChevronRight, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function AgentProfileCard({ agentId, dict, locale }: { agentId: string, dict: any, locale: string }) {
    const [agent, setAgent] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAgent = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('profiles').select('*').eq('id', agentId).single()
            if (data) setAgent(data)
            setLoading(false)
        }
        if (agentId) fetchAgent()
    }, [agentId])

    if (loading) return <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 flex items-center justify-center h-40"><Loader2 className="animate-spin text-navy-primary" /></div>
    if (!agent) return null

    const title = dict.common.senior_agent || 'Senior Agent'
    const languages = [dict.common.jp, dict.common.en, dict.common.th]

    return (
        <div className="bg-white rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-xl border border-slate-100 flex-shrink-0">
            <h3 className="text-xs sm:text-sm font-normal text-slate-400 uppercase tracking-widest mb-6 text-center sm:text-left">{dict.common.agent_label}</h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 sm:mb-8 text-center sm:text-left">
                <div className="w-20 h-20 sm:w-16 sm:h-16 bg-navy-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-slate-100">
                    {agent.avatar_url ? (
                        <Image src={agent.avatar_url} alt={agent.full_name || 'Agent'} width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                        <User className="w-8 h-8 text-navy-primary" />
                    )}
                </div>
                <div>
                    <h4 className="text-sm sm:text-base font-normal text-navy-secondary leading-tight mt-2 sm:mt-0">
                        {agent.full_name || '提携エージェント (未登録)'}
                    </h4>
                    <p className="text-[10px] font-normal text-slate-400 mt-1 uppercase tracking-widest">{title}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                        {languages.map(lang => (
                            <span key={lang} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-1 rounded-full font-normal">
                                {lang}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <Link href={`/${locale}/agents/${agentId}`} className="text-[10px] font-normal text-navy-primary hover:text-indigo-600 transition-colors uppercase tracking-widest inline-flex items-center gap-1 group">
                    {dict.common.view_agent_details}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    )
}
