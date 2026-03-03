import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
    MapPin,
    Home,
    Building2,
    BedDouble,
    Bath,
    Layers,
    ArrowLeft,
    Filter
} from 'lucide-react'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'

export const revalidate = 60
export const runtime = 'edge'

export default async function AgentPropertiesPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { id: agentId } = await params;
    const searchParamsObj = await searchParams;
    // We use the admin client here to bypass RLS on the profiles table since public read isn't enabled
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch Agent Name for Header
    const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', agentId)
        .single()

    if (agentError) {
        console.error("Fetch agent error:", agentError)
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

    // Filter Logic (Simple Server-Side)
    let query = supabase
        .from('properties')
        .select('*, area:areas(name, region:regions(name))', { count: 'exact' })
        .eq('user_id', agentId)
        .eq('status', 'published')

    // Simple Sorting (default newest)
    const sort = typeof searchParamsObj.sort === 'string' ? searchParamsObj.sort : 'newest'
    if (sort === 'price_asc') {
        query = query.order('price', { ascending: true })
        query = query.order('rent_price', { ascending: true }) // Fallback
    } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false })
        query = query.order('rent_price', { ascending: false }) // Fallback
    } else {
        query = query.order('created_at', { ascending: false })
    }

    // Temporary Pagination (just a larger limit for now, can implement real pagination later)
    query = query.limit(50)

    const { data: properties, count } = await query

    return (
        <div className="bg-slate-50 min-h-screen">
            <BreadcrumbUpdater label={`${agent.full_name || 'エージェント'}の取り扱い物件`} />

            <main className="container mx-auto px-4 pt-8 md:pt-12 pb-24 max-w-[1400px]">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-slate-200">
                    <div>
                        <Link href={`/agents/${agentId}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-navy-primary transition-colors mb-4 group">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            プロフィールに戻る
                        </Link>
                        <div className="flex items-center gap-4">
                            {agent.avatar_url && (
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                    <Image src={agent.avatar_url} alt={agent.full_name || ''} width={48} height={48} className="object-cover w-full h-full" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-navy-secondary">
                                    {agent.full_name}の取り扱い物件
                                </h1>
                                <p className="text-sm font-bold text-slate-500 mt-1">
                                    全 {count || 0} 件の公開物件
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Simple Filter / Sort UI */}
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <select className="appearance-none bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-3 rounded-xl pr-10 focus:outline-none focus:ring-2 focus:ring-navy-primary cursor-pointer hover:border-slate-300 transition-colors shadow-sm relative z-10 w-full md:w-auto">
                                <option value="newest">新着順</option>
                                <option value="price_asc">価格が安い順</option>
                                <option value="price_desc">価格が高い順</option>
                            </select>
                            <Filter className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none group-hover:text-navy-primary transition-colors" />
                        </div>
                    </div>
                </div>

                {/* Property Grid */}
                {properties && properties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {properties.map(property => (
                            <Link key={property.id} href={`/properties/${property.id}`} className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative flex flex-col h-full">
                                {/* Property Card Thumbnail */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 shrink-0">
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

                                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                                        {property.is_for_sale && <span className="text-[10px] font-black bg-white/95 text-navy-primary px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">売買</span>}
                                        {property.is_for_rent && <span className="text-[10px] font-black bg-navy-primary/95 text-white px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">賃貸</span>}
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                                    <div className="absolute bottom-4 left-4 flex items-center text-[10px] font-bold text-white uppercase tracking-widest gap-1 drop-shadow-md z-20">
                                        <MapPin className="w-3.5 h-3.5 text-white" />
                                        {property.area?.name || 'Area'}
                                    </div>
                                </div>

                                {/* Property Card Content */}
                                <div className="p-6 flex flex-col flex-grow">
                                    <h3 className="font-black text-navy-secondary text-base leading-tight line-clamp-2 mb-4 group-hover:text-navy-primary transition-colors min-h-[40px]">
                                        {property.title}
                                    </h3>

                                    <div className="mt-auto border-t border-slate-100 pt-5 flex items-center justify-between">
                                        <div className="text-xl font-black text-navy-secondary tabular-nums tracking-tight">
                                            <span className="text-xs text-slate-400 mr-1">฿</span>
                                            {property.price?.toLocaleString() || property.rent_price?.toLocaleString() || property.sale_price?.toLocaleString() || '---'}
                                            {property.is_for_rent && !property.is_for_sale && <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/ 月</span>}
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{property.sqm} sqm</div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <div className="flex items-center gap-1 text-[11px] font-black">
                                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{property.bedrooms === 0 ? 'ST' : property.bedrooms || 1}</span>
                                                </div>
                                                <div className="w-[1px] h-3 bg-slate-200"></div>
                                                <div className="flex items-center gap-1 text-[11px] font-black">
                                                    <Bath className="w-3.5 h-3.5 text-slate-400" />
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
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm col-span-full mt-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Home className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-navy-secondary mb-3">公開中の物件がありません</h3>
                        <p className="text-sm font-bold text-slate-500">
                            現在、条件に一致する物件は見つかりませんでした。
                        </p>
                    </div>
                )}

            </main>
        </div>
    )
}
