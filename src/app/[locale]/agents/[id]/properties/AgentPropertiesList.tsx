'use client'

import Image from 'next/image'
import Link from 'next/link'
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

interface AgentPropertiesListProps {
    locale: string
    agent: any
    agentId: string
    properties: any[]
    count: number | null
    type: string
    sort: string
}

function typeTabHref(locale: string, agentId: string, tabType: string, sort: string) {
    const p = new URLSearchParams()
    p.set('type', tabType)
    if (sort && sort !== 'newest') p.set('sort', sort)
    return `/${locale}/agents/${agentId}/properties?${p.toString()}`
}

export default function AgentPropertiesList({
    locale,
    agent,
    agentId,
    properties,
    count,
    type,
    sort
}: AgentPropertiesListProps) {
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(window.location.search)
        params.set('sort', e.target.value)
        window.location.href = `${window.location.pathname}?${params.toString()}`
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <BreadcrumbUpdater label={`${agent.full_name || 'エージェント'}の取り扱い物件`} />

            <main className="container mx-auto px-4 pt-8 md:pt-12 pb-24 max-w-[1400px]">

                {/* Header */}
                <div className="flex flex-col gap-6 mb-10 pb-8 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <Link href={`/${locale}/agents/${agentId}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-navy-primary transition-colors mb-4 group">
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

                        {/* Simple Sort UI */}
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-3 rounded-xl pr-10 focus:outline-none focus:ring-2 focus:ring-navy-primary cursor-pointer hover:border-slate-300 transition-colors shadow-sm relative z-10 w-full md:w-auto"
                                    value={sort}
                                    onChange={handleSortChange}
                                >
                                    <option value="newest">新着順</option>
                                    <option value="price_asc">価格が安い順</option>
                                    <option value="price_desc">価格が高い順</option>
                                </select>
                                <Filter className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none group-hover:text-navy-primary transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Filter tabs: 物件一覧（PropertiesClient）と同じピル＋軽いトランジション */}
                    <div className="mt-4">
                        <div className="flex flex-wrap gap-1 sm:gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                            {[
                                { label: 'すべて', value: 'all' },
                                { label: '賃貸', value: 'rent' },
                                { label: '売買', value: 'sell' },
                                { label: 'プレセール', value: 'presale' }
                            ].map((tab) => {
                                const active = type === tab.value
                                const isPresale = tab.value === 'presale'
                                return (
                                    <Link
                                        key={tab.value}
                                        href={typeTabHref(locale, agentId, tab.value, sort)}
                                        scroll={false}
                                        className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 ease-out active:scale-[0.98] ${
                                            active
                                                ? isPresale
                                                    ? 'bg-amber-500 text-white shadow-lg'
                                                    : 'bg-navy-primary text-white shadow-lg'
                                                : isPresale
                                                    ? 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'
                                                    : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'
                                        }`}
                                    >
                                        {tab.label}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Property Grid */}
                {properties && properties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {properties.map(property => (
                            <Link key={property.id} href={`/${locale}/properties/${property.id}`} className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative flex flex-col h-full">
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
                                        <div className="flex flex-col space-y-1">
                                            {property.is_for_sale && (
                                                <div className="text-lg font-black text-navy-secondary tabular-nums tracking-tight leading-none">
                                                    <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">売:</span>
                                                    <span className="text-xs text-slate-400 mr-0.5">฿</span>
                                                    {property.sale_price?.toLocaleString() || '---'}
                                                </div>
                                            )}
                                            {property.is_for_rent && (
                                                <div className="text-lg font-black text-navy-secondary tabular-nums tracking-tight leading-none">
                                                    <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">賃:</span>
                                                    <span className="text-xs text-slate-400 mr-0.5">฿</span>
                                                    {property.rent_price?.toLocaleString() || '---'}
                                                    <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/ 月</span>
                                                </div>
                                            )}
                                            {!property.is_for_sale && !property.is_for_rent && (
                                                <div className="text-xl font-black text-navy-secondary tabular-nums tracking-tight">
                                                    <span className="text-xs text-slate-400 mr-1">฿</span>
                                                    {property.price?.toLocaleString() || '---'}
                                                </div>
                                            )}
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
