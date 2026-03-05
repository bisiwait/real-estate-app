import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2, Globe, Award, MapPin, ChevronRight, Projector as Project } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DeveloperDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch developer info
    const { data: developer, error: devError } = await supabase
        .from('developers')
        .select('*')
        .eq('id', id)
        .single()

    if (devError || !developer) {
        return notFound()
    }

    // Fetch related projects
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
            *,
            area:areas(name)
        `)
        .eq('developer_id', id)
        .order('created_at', { ascending: false })

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Hero / Header */}
            <div className="bg-navy-secondary text-white pt-24 pb-32 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy-primary rounded-full blur-3xl -ml-48 -mb-48 opacity-30" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center shrink-0 border border-white/20 overflow-hidden">
                            {developer.logo_url ? (
                                <img src={developer.logo_url} alt={developer.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <Building2 className="w-16 h-16 text-slate-200" />
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">
                                Verified Developer
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">{developer.name}</h1>

                            <div className="flex flex-wrap justify-center md:justify-start gap-6">
                                {developer.website_url && (
                                    <a
                                        href={developer.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-sm font-bold text-slate-300 hover:text-white transition-colors"
                                    >
                                        <Globe className="w-4 h-4 mr-2" />
                                        Official Website
                                    </a>
                                )}
                                <div className="flex items-center text-sm font-bold text-slate-300">
                                    <Project className="w-4 h-4 mr-2" />
                                    {projects?.length || 0} Registered Projects
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-white/50 backdrop-blur-sm">
                            <h2 className="text-2xl font-black text-navy-secondary mb-8 flex items-center">
                                <Building2 className="w-6 h-6 mr-3 text-navy-primary" />
                                会社概要
                            </h2>
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">
                                    {developer.description || '会社概要は現在提供されていません。'}
                                </p>
                            </div>

                            {developer.track_record && Array.isArray(developer.track_record) && developer.track_record.length > 0 && (
                                <div className="mt-12">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">主な実績</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {developer.track_record.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Award className="w-5 h-5 text-amber-500 mr-3" />
                                                <span className="text-sm font-bold text-navy-secondary">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Projects Section */}
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-navy-secondary">進行中・管理プロジェクト</h2>
                                <span className="text-sm font-bold text-slate-400 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                                    Total {projects?.length || 0}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {projects?.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/properties?project=${project.id}`}
                                        className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100"
                                    >
                                        <div className="h-48 relative overflow-hidden bg-slate-100">
                                            {project.image_url ? (
                                                <img
                                                    src={project.image_url}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="w-10 h-10 text-slate-200" />
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4">
                                                <span className="bg-white/90 backdrop-blur-sm text-navy-primary text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm">
                                                    Project
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                {(project.area as any)?.name}
                                            </div>
                                            <h3 className="text-lg font-bold text-navy-secondary mb-4 group-hover:text-navy-primary transition-colors">
                                                {project.name}
                                            </h3>
                                            <div className="flex items-center justify-end">
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-navy-primary group-hover:text-white transition-all">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {(!projects || projects.length === 0) && (
                                <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold">
                                    プロジェクト情報がありません
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Stats */}
                    <div className="space-y-8">
                        <div className="bg-navy-primary rounded-3xl p-8 text-white shadow-xl shadow-navy-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                            <h3 className="text-lg font-black mb-6 relative z-10">お問い合わせはこちら</h3>
                            <p className="text-navy-primary-foreground/80 text-sm mb-8 relative z-10 leading-relaxed">
                                このデベロッパーの物件に関する詳細情報や内見のご相談は、専任のエージェントまでお気軽にご連絡ください。
                            </p>
                            <Link
                                href="/contact"
                                className="block w-full text-center bg-white text-navy-primary py-4 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-lg active:scale-[0.98]"
                            >
                                お問い合わせフォーム
                            </Link>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">デベロッパー情報</h3>
                            <dl className="space-y-6">
                                <div>
                                    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name</dt>
                                    <dd className="font-bold text-navy-secondary">{developer.name}</dd>
                                </div>
                                {developer.website_url && (
                                    <div>
                                        <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Site</dt>
                                        <dd>
                                            <a href={developer.website_url} className="text-sm font-bold text-navy-primary hover:underline flex items-center">
                                                Website <Globe className="w-3 h-3 ml-2" />
                                            </a>
                                        </dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</dt>
                                    <dd className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                        <span className="text-sm font-bold text-navy-secondary">Active Listed</span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
