import { createClient } from '@/lib/supabase/server'
import { Phone, MessageCircle, User, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default async function AgentProfileCard({ agentId }: { agentId: string }) {
    const supabase = await createClient()
    const { data: agent } = await supabase.from('profiles').select('*').eq('id', agentId).single()

    if (!agent) return null

    // For demo purposes, we can add some placeholder data if the profile lacks it
    const title = 'シニアエージェント'
    const languages = ['日本語', 'English', 'ภาษาไทย']

    return (
        <div className="bg-white rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-xl border border-slate-100 flex-shrink-0">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center sm:text-left">担当エージェント</h3>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 sm:mb-8 text-center sm:text-left">
                <div className="w-20 h-20 sm:w-16 sm:h-16 bg-navy-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-slate-100">
                    {agent.avatar_url ? (
                        <Image src={agent.avatar_url} alt={agent.full_name || 'Agent'} width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                        <User className="w-8 h-8 text-navy-primary" />
                    )}
                </div>
                <div>
                    <h4 className="text-base sm:text-lg font-black text-navy-secondary leading-tight mt-2 sm:mt-0">
                        {agent.full_name || '提携エージェント (未登録)'}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{title}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                        {languages.map(lang => (
                            <span key={lang} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-1 rounded-full font-bold">
                                {lang}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
                <a href="#whatsapp" className="flex items-center justify-center w-full py-3 sm:py-3.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-sm gap-2">
                    <MessageCircle className="w-5 h-5" />
                    WhatsAppで問い合わせ
                </a>
                <a href="#line" className="flex items-center justify-center w-full py-3 sm:py-3.5 bg-[#06C755]/10 hover:bg-[#06C755] text-[#06C755] hover:text-white rounded-2xl font-black text-xs sm:text-sm transition-all shadow-sm gap-2">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    LINEで相談
                </a>
                <a href="#phone" className="flex items-center justify-center w-full py-3 sm:py-3.5 bg-slate-50 border-2 border-transparent hover:border-slate-200 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-sm gap-2">
                    <Phone className="w-5 h-5" />
                    電話をかける
                </a>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <Link href={`/agents/${agentId}`} className="text-[10px] font-black text-navy-primary hover:text-indigo-600 transition-colors uppercase tracking-widest inline-flex items-center gap-1 group">
                    エージェントの詳細を見る
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    )
}
