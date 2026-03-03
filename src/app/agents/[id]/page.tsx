import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
    BedDouble,
    Bath,
    Layers,
    ArrowRight,
    ChevronRight
} from 'lucide-react'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'

export const revalidate = 60 // Revalidate page every 60 seconds
export const runtime = 'edge'

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // We use the admin client here to bypass RLS on the profiles table since public read isn't enabled
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch Agent Profile
    const { id: agentId } = await params;
    const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', agentId)
        .single()

    // Debugging 404
    if (agentError) {
        console.error("Agent Fetch Error:", agentError)
    }

    if (!agent) {
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Error: Agent Not Found</h1>
                <p>ID: {agentId}</p>
                <p>Error details: {JSON.stringify(agentError)}</p>
                <p>If you recently fixed permissions, try clearing Next.js cache or restarting the dev server.</p>
            </div>
        )
    }

    // 2. Fetch Agent's Latest Published Properties
    const { data: properties } = await supabase
        .from('properties')
        .select('*, area:areas(name, region:regions(name))')
        .eq('user_id', agentId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(4)

    // 3. Count total active listings
    const { count: totalListings } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', agentId)
        .eq('status', 'published')

    // Dummy Data for fields not currently in `profiles` schema but requested by User
    const experienceYears = 5
    const languages = ['日本語', 'English', 'ภาษาไทย']
    const specializations = ['コンドミニアム', '投資用物件', 'シラチャエリア']
    const areas = ['パタヤ', 'ジョムティエン', 'シラチャ']
    const bio = `タイでの不動産探しはお任せください。駐在員様向けのご家族用コンドミニアムから、単身向けの利便性の高い物件、さらには利回り重視の投資用物件まで、お客様のニーズにきめ細かく対応いたします。現地での長期滞在経験を活かし、周辺環境や生活セットアップも含めてトータルでサポートさせていただきます。`
    const dealsClosed = 128

    return (
        <div className="bg-slate-50 min-h-screen">
            <BreadcrumbUpdater label={agent.full_name || 'エージェント'} />

            <main className="container mx-auto px-4 pt-8 md:pt-12 pb-24 max-w-[1200px]">

                {/* Agent Header / Hero Section */}
                <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-xl border border-slate-100 mb-8 sm:mb-12 relative overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-navy-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 relative z-10">
                        {/* Avatar & Title */}
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:col-span-1">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-6 shrink-0 relative">
                                {agent.avatar_url ? (
                                    <Image src={agent.avatar_url} alt={agent.full_name || 'Agent'} fill className="object-cover" />
                                ) : (
                                    <User className="w-20 h-20 text-slate-300" />
                                )}

                                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="認証済みエージェント">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-navy-secondary mb-2">
                                {agent.full_name || '提携エージェント'}
                            </h1>
                            <p className="text-sm font-bold text-navy-primary/80 uppercase tracking-widest mb-6 border-b-2 border-navy-primary/20 pb-4 inline-block">
                                シニアエージェント
                            </p>

                            {/* Languages */}
                            <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                                <Globe className="w-4 h-4 text-slate-400 mr-1" />
                                {languages.map(lang => (
                                    <span key={lang} className="text-[11px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Bio & Details */}
                        <div className="lg:col-span-2 flex flex-col justify-center">

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-4 sm:gap-6 mb-8 pb-8 border-b border-slate-100 justify-center lg:justify-start">
                                <div className="text-center lg:text-left">
                                    <div className="text-2xl sm:text-3xl font-black text-navy-secondary">{totalListings || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">掲載中の物件</div>
                                </div>
                                <div className="w-px bg-slate-100 hidden sm:block"></div>
                                <div className="text-center lg:text-left">
                                    <div className="text-2xl sm:text-3xl font-black text-navy-secondary">{dealsClosed}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">成約実績</div>
                                </div>
                                <div className="w-px bg-slate-100 hidden sm:block"></div>
                                <div className="text-center lg:text-left">
                                    <div className="text-2xl sm:text-3xl font-black text-navy-secondary">{experienceYears}<span className="text-lg">年</span></div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">業界経験</div>
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">ご挨拶</h3>
                            <p className="text-slate-600 leading-relaxed font-medium mb-8">
                                {bio}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-[11px] font-black justify-start text-navy-secondary uppercase tracking-widest flex items-center gap-2 mb-3">
                                        <MapPin className="w-3.5 h-3.5 text-navy-primary" />
                                        得意エリア
                                    </h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {areas.map(area => (
                                            <span key={area} className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {area}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black justify-start text-navy-secondary uppercase tracking-widest flex items-center gap-2 mb-3">
                                        <Home className="w-3.5 h-3.5 text-navy-primary" />
                                        得意分野
                                    </h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {specializations.map(spec => (
                                            <span key={spec} className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Sidebar Contact Actions (Sticky on Desktop) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 sticky top-28">
                            <h3 className="text-sm font-black text-navy-secondary text-center lg:text-left mb-6">このエージェントに直接連絡する</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                                <a href="#whatsapp" className="flex items-center justify-between w-full p-3 sm:p-4 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-2xl transition-all shadow-sm group">
                                    <div className="flex items-center gap-3 font-black text-xs sm:text-sm">
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        WhatsApp
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </a>

                                <a href="#line" className="flex items-center justify-between w-full p-3 sm:p-4 bg-[#06C755]/10 hover:bg-[#06C755] text-[#06C755] hover:text-white rounded-2xl transition-all shadow-sm group">
                                    <div className="flex items-center gap-3 font-black text-xs sm:text-sm">
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30">
                                            <MessageCircle className="w-5 h-5 fill-current" />
                                        </div>
                                        LINE
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </a>

                                <a href={`tel:${agent.phone || ''}`} className="flex items-center justify-between w-full p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all shadow-sm group border border-slate-100">
                                    <div className="flex items-center gap-3 font-black text-xs sm:text-sm">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        電話をかける
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-all" />
                                </a>

                                <a href={`mailto:${agent.email || ''}`} className="flex items-center justify-between w-full p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all shadow-sm group border border-slate-100">
                                    <div className="flex items-center gap-3 font-bold text-xs sm:text-sm">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        メールで問い合わせ
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-all" />
                                </a>
                            </div>

                            <p className="text-[10px] text-slate-400 text-center mt-6">
                                ※「ポータルサイトを見た」とお伝えください。
                            </p>
                        </div>
                    </div>

                    {/* Latest Properties Area */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-navy-secondary">担当物件</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Latest Listings</p>
                            </div>

                            {(totalListings || 0) > 4 && (
                                <Link href={`/agents/${agentId}/properties`} className="flex items-center gap-2 text-sm font-black text-navy-primary hover:text-indigo-600 group px-4 py-2 bg-navy-primary/5 rounded-xl transition-colors">
                                    全 {totalListings} 件を見る
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            )}
                        </div>

                        {properties && properties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {properties.map(property => (
                                    <Link key={property.id} href={`/properties/${property.id}`} className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative">
                                        {/* Property Card Thumbnail */}
                                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
                                            {property.images && property.images.length > 0 ? (
                                                <Image
                                                    src={property.images[0]}
                                                    alt={property.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2">
                                                    <Building2 className="w-8 h-8 opacity-20" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                                                </div>
                                            )}

                                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                {property.is_for_sale && <span className="text-[10px] font-black bg-white/95 text-navy-primary px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">売買</span>}
                                                {property.is_for_rent && <span className="text-[10px] font-black bg-navy-primary/95 text-white px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">賃貸</span>}
                                            </div>

                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 flex items-center text-[10px] font-bold text-white uppercase tracking-widest gap-1 drop-shadow-md">
                                                <MapPin className="w-3.5 h-3.5 text-white" />
                                                {property.area?.name || 'Area'}
                                            </div>
                                        </div>

                                        {/* Property Card Content */}
                                        <div className="p-6">
                                            <h3 className="font-black text-navy-secondary text-base leading-tight line-clamp-2 mb-4 group-hover:text-navy-primary transition-colors min-h-[40px]">
                                                {property.title}
                                            </h3>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto">
                                                <div className="text-xl font-black text-navy-secondary tabular-nums tracking-tight">
                                                    <span className="text-xs text-slate-400 mr-1">฿</span>
                                                    {property.price?.toLocaleString()}
                                                    {property.is_for_rent && !property.is_for_sale && <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/ 月</span>}
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{property.sqm} sqm</div>
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <div className="flex items-center gap-1 text-[11px] font-black">
                                                            <Layers className="w-3 h-3" />
                                                            <span>{property.bedrooms === 0 ? 'ST' : property.bedrooms || 1}</span>
                                                        </div>
                                                        <div className="w-[1px] h-3 bg-slate-200"></div>
                                                        <div className="flex items-center gap-1 text-[11px] font-black">
                                                            <Bath className="w-3 h-3" />
                                                            <span>{property.bathrooms || 1}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Home className="w-6 h-6 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-black text-navy-secondary mb-2">現在公開中の物件はありません</h3>
                                <p className="text-sm font-bold text-slate-400">
                                    このエージェントは現在新しい物件を準備中です。
                                </p>
                            </div>
                        )}

                        {(totalListings || 0) > 4 && (
                            <div className="mt-8 text-center sm:hidden">
                                <Link href={`/agents/${agentId}/properties`} className="inline-flex items-center justify-center gap-2 w-full text-sm font-black text-white bg-navy-primary hover:bg-navy-secondary px-6 py-4 rounded-xl transition-all shadow-md group">
                                    すべての物件を見る ({totalListings}件)
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    )
}
