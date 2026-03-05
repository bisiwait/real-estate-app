import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight, Building2, Globe, Award } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const runtime = 'edge';

export default async function DevelopersPage() {
    const supabase = await createClient()

    const { data: developers, error } = await supabase
        .from('developers')
        .select(`
            *,
            projects:projects(count)
        `)
        .order('name')

    if (error) {
        console.error('Error fetching developers:', error)
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-navy-secondary text-white pt-20 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-6 h-full w-full">
                        {[...Array(12)].map((_, i) => <div key={i} className="border border-white/10" />)}
                    </div>
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl font-black mb-4 tracking-tight">主要デベロッパー</h1>
                    <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
                        パタヤ・シラチャの不動産開発を牽引するトップレベルのデベロッパーをご紹介します。
                        これまでの実績やプロジェクトの質を基に、信頼できるパートナー探しをお手伝いします。
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="container mx-auto px-4 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {developers?.map((developer) => (
                        <Link
                            key={developer.id}
                            href={`/developers/${developer.id}`}
                            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col items-start text-left"
                        >
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 overflow-hidden border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                {developer.logo_url ? (
                                    <img src={developer.logo_url} alt={developer.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building2 className="w-10 h-10 text-slate-300" />
                                )}
                            </div>

                            <h2 className="text-xl font-black text-navy-secondary mb-3 group-hover:text-navy-primary transition-colors">
                                {developer.name}
                            </h2>

                            <p className="text-slate-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                                {developer.description || '会社概要が登録されていません。'}
                            </p>

                            <div className="mt-auto w-full pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</span>
                                        <span className="text-sm font-black text-navy-secondary">{(developer.projects?.[0] as any)?.count || 0} 件</span>
                                    </div>
                                    {developer.website_url && (
                                        <div className="h-4 w-px bg-slate-200"></div>
                                    )}
                                    {developer.website_url && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL</span>
                                            <span className="text-sm font-black text-navy-secondary">Official</span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-navy-primary group-hover:text-white transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {(!developers || developers.length === 0) && (
                    <div className="bg-white rounded-3xl p-20 text-center shadow-sm border border-slate-100">
                        <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-navy-secondary mb-2">デベロッパーが見つかりません</h3>
                        <p className="text-slate-500">現在、デベロッパー情報を準備中です。</p>
                    </div>
                )}
            </div>
        </div>
    )
}
