'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
    MapPin,
    Home,
    Building2,
    Bath,
    Layers,
    ArrowLeft,
    Filter,
    Loader2
} from 'lucide-react'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'
import { resolveAvatarUrl } from '@/lib/property-image-url'
import PropertyThumbnail from '@/components/property/PropertyThumbnail'

interface AgentPropertiesListProps {
    dict: any
    locale: string
    agent: any
    agentId: string
    properties: any[]
    count: number | null
    type: string
    sort: string
}

export default function AgentPropertiesList({
    dict,
    locale,
    agent,
    agentId,
    properties,
    count,
    type,
    sort
}: AgentPropertiesListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isFilterNavPending, startFilterNavTransition] = useTransition()
    const [listLoading, setListLoading] = useState(false)
    /** URL 反映前にタブ見た目を即切り替え（物件一覧と同様） */
    const [optimisticType, setOptimisticType] = useState<string | null>(null)

    const displayType = optimisticType ?? type
    const resultsBusy = listLoading || isFilterNavPending

    useEffect(() => {
        setListLoading(false)
        setOptimisticType(null)
    }, [type, sort, count])

    const buildListUrl = useCallback(
        (nextType: string, nextSort: string) => {
            const p = new URLSearchParams()
            p.set('type', nextType)
            if (nextSort && nextSort !== 'newest') p.set('sort', nextSort)
            return `${pathname}?${p.toString()}`
        },
        [pathname]
    )

    const applyTypeTab = (tabType: string) => {
        if (tabType === type && optimisticType === null) return
        setOptimisticType(tabType)
        setListLoading(true)
        const url = buildListUrl(tabType, sort)
        const current = searchParams.toString()
        const nextQs = url.includes('?') ? url.split('?')[1] ?? '' : ''
        if (nextQs === current) {
            setListLoading(false)
            setOptimisticType(null)
            return
        }
        startFilterNavTransition(() => {
            router.replace(url, { scroll: false })
        })
    }

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value
        if (v === sort) return
        setListLoading(true)
        const p = new URLSearchParams(searchParams.toString())
        if (v === 'newest') p.delete('sort')
        else p.set('sort', v)
        const qs = p.toString()
        const url = qs ? `${pathname}?${qs}` : pathname
        startFilterNavTransition(() => {
            router.replace(url, { scroll: false })
        })
    }

    const refreshingLabel = dict?.property?.refreshing_results ?? '結果を更新中…'
    const avatarSrc = resolveAvatarUrl(agent.avatar_url)

    return (
        <div className="bg-slate-50 min-h-screen">
            <BreadcrumbUpdater label={`${agent.full_name || 'エージェント'}の取り扱い物件`} />

            <main className="container mx-auto px-4 pt-8 md:pt-12 pb-24 max-w-[1400px]">

                <div className="flex flex-col gap-6 mb-10 pb-8 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <Link href={`/${locale}/agents/${agentId}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-navy-primary transition-colors mb-4 group">
                                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                プロフィールに戻る
                            </Link>
                            <div className="flex items-center gap-4">
                                {avatarSrc && (
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                                        <Image
                                            src={avatarSrc}
                                            alt={agent.full_name || ''}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black text-navy-secondary">
                                        {agent.full_name}の取り扱い物件
                                    </h1>
                                    <p className="text-sm font-bold text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                        {resultsBusy ? (
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-primary" aria-hidden />
                                        ) : null}
                                        <span>全 {count ?? 0} 件の公開物件</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <select
                                    className="appearance-none bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-3 rounded-xl pr-10 focus:outline-none focus:ring-2 focus:ring-navy-primary cursor-pointer hover:border-slate-300 transition-colors shadow-sm relative z-10 w-full md:w-auto disabled:opacity-60"
                                    value={sort}
                                    disabled={resultsBusy}
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

                    <div className="mt-4">
                        <div className="flex flex-wrap gap-1 sm:gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl w-full min-w-0 sm:w-fit border border-slate-200 shadow-sm overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar">
                            {[
                                { label: 'すべて', value: 'all' },
                                { label: '賃貸', value: 'rent' },
                                { label: '売買', value: 'sell' },
                                { label: 'プレセール', value: 'presale' }
                            ].map((tab) => {
                                const active = displayType === tab.value
                                const isPresale = tab.value === 'presale'
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => applyTypeTab(tab.value)}
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
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {properties && properties.length > 0 ? (
                    <div
                        className={`relative min-h-[320px] transition-opacity duration-150 ![overflow-anchor:none] ${resultsBusy ? 'opacity-60' : 'opacity-100'}`}
                        style={{ overflowAnchor: 'none' }}
                        aria-busy={resultsBusy}
                    >
                        {resultsBusy ? (
                            <div
                                className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 flex items-center gap-2 rounded-full border border-slate-100 bg-white/95 px-4 py-2 shadow-lg"
                                aria-live="polite"
                            >
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-primary" aria-hidden />
                                <span className="text-xs font-black text-navy-secondary">{refreshingLabel}</span>
                            </div>
                        ) : null}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {properties.map(property => (
                                <Link key={property.id} href={`/${locale}/properties/${property.id}`} className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative flex flex-col h-full">
                                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 shrink-0">
                                        <PropertyThumbnail
                                            src={property.images?.[0]}
                                            alt={property.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />

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
