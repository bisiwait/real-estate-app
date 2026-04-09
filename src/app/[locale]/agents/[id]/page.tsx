"use client";
import { createClient } from '@/lib/supabase/client'
import { isPremiumActive } from '@/lib/utils/plan'
import { getAgentsPageLineGateCopy } from '@/lib/i18n/locale-plans-copy'
import { notFound, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    Phone,
    MessageCircle,
    Mail,
    User,
    MapPin,
    Home,
    CheckCircle,
    Globe,
    Building2,
    Bath,
    Layers,
    ArrowRight,
    ChevronRight,
    RefreshCw
} from 'lucide-react'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'


export default function AgentProfilePage() {
    const params = useParams()
    const agentId = params?.id as string
    const locale = (params?.locale as string) || 'jp'
    
    const [agent, setAgent] = useState<any>(null)
    const [properties, setProperties] = useState<any[]>([])
    const [totalListings, setTotalListings] = useState(0)
    const [loading, setLoading] = useState(true)
    const [hideAgent, setHideAgent] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            
            // Fetch Agent Profile
            const { data: aData } = await supabase.from('profiles').select('*').eq('id', agentId).single()
            if (aData) {
                if (aData.deleted_at != null || aData.status === 'suspended') {
                    setHideAgent(true)
                    setLoading(false)
                    return
                }
                setAgent(aData)
                
                // Fetch Properties
                const { data: pData } = await supabase
                    .from('properties')
                    .select('*, area:areas(name, region:regions(name))')
                    .eq('user_id', agentId)
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(4)
                setProperties(pData || [])

                // Count
                const { count } = await supabase
                    .from('properties')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', agentId)
                    .eq('status', 'published')
                setTotalListings(count || 0)
            }
            setLoading(false)
        }
        if (agentId) fetchData()
    }, [agentId])

    if (loading) return <div className="p-20 flex justify-center"><RefreshCw className="animate-spin text-navy-primary w-10 h-10" /></div>
    if (hideAgent) return notFound()
    if (!agent) return notFound()

    const agentLineContactVisible =
        agent.show_line_in_inquiry !== false &&
        Boolean(agent.line_id?.toString().trim()) &&
        isPremiumActive(agent)

    const languages = ['日本語', 'English', 'ภาษาไทย']
    const areas = ['パタヤ', 'ジョムティエン', 'シラチャ']

    return (
        <div className="bg-slate-50 min-h-screen">
            <BreadcrumbUpdater label={agent.full_name || 'エージェント'} />
            <main className="container mx-auto px-4 pt-12 pb-24 max-w-[1200px]">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-slate-100 mb-12 relative overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                            <div className="w-48 h-48 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-6 relative">
                                {agent.avatar_url ? <Image src={agent.avatar_url} alt={agent.full_name} fill className="object-cover" /> : <User className="w-20 h-20 text-slate-300" />}
                                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm"><CheckCircle className="w-5 h-5" /></div>
                            </div>
                            <h1 className="text-3xl font-normal text-navy-secondary mb-2">{agent.full_name || '提携エージェント'}</h1>
                            <p className="text-sm font-normal text-navy-primary/80 uppercase tracking-widest mb-6 border-b-2 border-navy-primary/20 pb-4 inline-block">シニアエージェント</p>
                            <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                                <Globe className="w-4 h-4 text-slate-400 mr-1" />
                                {languages.map(l => <span key={l} className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-normal">{l}</span>)}
                            </div>
                        </div>
                        <div className="lg:col-span-2 flex flex-col justify-center">
                            <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-slate-100">
                                <StatItem value={totalListings} label="掲載中の物件" />
                                <StatItem value={128} label="成約実績" />
                                <StatItem value={5} label="業界経験" suffix="年" />
                            </div>
                            <h3 className="text-sm font-normal text-slate-400 uppercase tracking-widest mb-4">ご挨拶</h3>
                            <p className="text-slate-600 leading-relaxed font-normal mb-8">{agent.bio || 'タイでの不動産探しはお任せください。駐在員様向けのご家族用コンドミニアムから、投資用物件まで幅広く対応いたします。'}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <AreaSection title="得意エリア" items={areas} icon={MapPin} />
                                <AreaSection title="得意分野" items={['コンドミニアム', '投資', 'シラチャ']} icon={Home} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 sticky top-28">
                            <h3 className="text-sm font-normal text-navy-secondary mb-6">このエージェントに連絡する</h3>
                            <div className="space-y-4">
                                {agentLineContactVisible ? (
                                    <ContactBtn
                                        href={(() => {
                                            const s = String(agent.line_id).trim()
                                            return s.startsWith('http') ? s : '#'
                                        })()}
                                        label="LINE"
                                        icon={MessageCircle}
                                        color="emerald"
                                    />
                                ) : agent.show_line_in_inquiry !== false && agent.line_id ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-500">
                                        {getAgentsPageLineGateCopy(locale)}
                                    </div>
                                ) : null}
                                {agent.phone && agent.show_phone_in_inquiry !== false ? (
                                    <ContactBtn href={`tel:${agent.phone}`} label="電話をかける" icon={Phone} color="slate" />
                                ) : null}
                                <ContactBtn href={`mailto:${agent.email}`} label="メール問い合わせ" icon={Mail} color="slate" />
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-normal text-navy-secondary">担当物件</h2>
                            {totalListings > 4 && (
                                <Link
                                    href={`/${locale}/agents/${agentId}/properties`}
                                    className="text-sm font-normal text-navy-primary bg-navy-primary/5 px-4 py-2 rounded-xl"
                                >
                                    全 {totalListings} 件
                                </Link>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {properties.map((p) => (
                                <PropertyCard key={p.id} property={p} locale={locale} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatItem({ value, label, suffix = '' }: any) {
    return (
        <div>
            <div className="text-2xl font-normal text-navy-secondary">{value}<span className="text-lg">{suffix}</span></div>
            <div className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mt-1">{label}</div>
        </div>
    )
}

function AreaSection({ title, items, icon: Icon }: any) {
    return (
        <div>
            <h4 className="text-[11px] font-normal text-navy-secondary uppercase tracking-widest flex items-center gap-2 mb-3"><Icon className="w-3.5 h-3.5 text-navy-primary" /> {title}</h4>
            <div className="flex gap-2 flex-wrap">{items.map((i: any) => <span key={i} className="text-xs font-normal text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{i}</span>)}</div>
        </div>
    )
}

function ContactBtn({ href, label, icon: Icon, color }: any) {
    const bg = color === 'emerald' ? 'bg-[#06C755]/10 hover:bg-[#06C755] text-[#06C755] hover:text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
    return (
        <a href={href} className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all shadow-sm group ${bg}`}>
            <div className="flex items-center gap-3 font-normal text-sm">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                {label}
            </div>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1" />
        </a>
    )
}

function PropertyCard({ property, locale }: { property: any; locale: string }) {
    return (
        <Link
            href={`/${locale}/properties/${property.id}`}
            className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden"
        >
            <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
                {property.images?.[0] ? <Image src={property.images[0]} alt={property.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center"><Building2 className="opacity-20" /></div>}
            </div>
            <div className="p-6">
                <h3 className="font-normal text-navy-secondary text-base line-clamp-2 mb-4 group-hover:text-navy-primary transition-colors">{property.title}</h3>
                <div className="text-lg font-normal text-navy-secondary"><span className="text-xs mr-0.5">฿</span>{property.rent_price?.toLocaleString() || property.sale_price?.toLocaleString()}</div>
            </div>
        </Link>
    )
}
