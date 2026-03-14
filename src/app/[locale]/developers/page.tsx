export const runtime = 'edge';
import { createStaticClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight, Building2, Globe, Award } from 'lucide-react'

export const dynamic = 'force-static'
export const revalidate = 3600

export default async function DevelopersPage() {
    const supabase = createStaticClient()

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
                    <h1 className="text-4xl font-black mb-4 tracking-tight">荳ｻ隕√ョ繝吶Ο繝・ヱ繝ｼ</h1>
                    <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
                        繝代ち繝､繝ｻ繧ｷ繝ｩ繝√Ε縺ｮ荳榊虚逕｣髢狗匱繧堤何蠑輔☆繧九ヨ繝・・繝ｬ繝吶Ν縺ｮ繝・・繝ｭ繝・ヱ繝ｼ繧偵＃邏ｹ莉九＠縺ｾ縺吶・
                        縺薙ｌ縺ｾ縺ｧ縺ｮ螳溽ｸｾ繧・・繝ｭ繧ｸ繧ｧ繧ｯ繝医・雉ｪ繧貞渕縺ｫ縲∽ｿ｡鬆ｼ縺ｧ縺阪ｋ繝代・繝医リ繝ｼ謗｢縺励ｒ縺頑焔莨昴＞縺励∪縺吶・
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
                                {developer.description || '莨夂､ｾ讎りｦ√′逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲・}
                            </p>

                            <div className="mt-auto w-full pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</span>
                                        <span className="text-sm font-black text-navy-secondary">{(developer.projects?.[0] as any)?.count || 0} 莉ｶ</span>
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
                        <h3 className="text-xl font-bold text-navy-secondary mb-2">繝・・繝ｭ繝・ヱ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ</h3>
                        <p className="text-slate-500">迴ｾ蝨ｨ縲√ョ繝吶Ο繝・ヱ繝ｼ諠・ｱ繧呈ｺ門ｙ荳ｭ縺ｧ縺吶・/p>
                    </div>
                )}
            </div>
        </div>
    )
}
