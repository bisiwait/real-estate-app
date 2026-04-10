'use client'

import React, { useState } from 'react'
import { 
    Building2,
    Mail,
    Users,
    ChevronRight,
    LayoutDashboard,
    PlusCircle,
    MessageCircle,
} from 'lucide-react'
import Link from 'next/link'
import LeadsView from '@/components/dashboard/LeadsView'
import BulkConfirmButton from '@/components/dashboard/BulkConfirmButton'
import StatusFilter from '@/components/dashboard/StatusFilter'
import PropertyEndListingButton from '@/components/dashboard/PropertyEndListingButton'
import FreshnessBadge from '@/components/dashboard/FreshnessBadge'
import PropertyConfirmButton from '@/components/dashboard/PropertyConfirmButton'
import DashboardActions from '@/components/dashboard/DashboardActions'
import InquiryList from '@/components/dashboard/InquiryList'

function PropertyLineInquiryBadge({ count, className = '' }: { count: number; className?: string }) {
    const active = count > 0
    return (
        <span
            className={`inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black tabular-nums ${
                active
                    ? 'border-[#06C755]/35 bg-[#06C755]/10 text-[#047c3d]'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
            } ${className}`}
            title="この物件のLINE問い合わせ導線の件数（今月・日本時間）"
        >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            <span>{count}</span>
            <span className="sr-only">LINE問い合わせ 今月</span>
        </span>
    )
}

interface DashboardClientProps {
    initialTab: string
    initialFilter: string
    initialStatus: string
    profile: any
    initialProperties: any[]
    initialInquiries: any[]
    initialLeads: any[]
    leadsCount: number
    locale: string
    activePlan: string
    /** 日本時間・今月1日0時以降の line_inquiry_counts を物件 id ごとに集計 */
    lineInquiryCountsByPropertyThisMonth: Record<string, number>
}

export default function DashboardClient({
    initialTab,
    initialFilter,
    initialStatus,
    profile,
    initialProperties,
    initialInquiries,
    initialLeads,
    leadsCount,
    locale,
    activePlan,
    lineInquiryCountsByPropertyThisMonth,
}: DashboardClientProps) {
    const [tab, setTab] = useState(initialTab)
    const [filter, setFilter] = useState(initialFilter)
    const [status, setStatus] = useState(initialStatus)
    const [properties] = useState(initialProperties)
    const [inquiries] = useState(initialInquiries)
    const [leads] = useState(initialLeads || [])

    // フィルタリング処理（クライアント側で行う）
    const getFilteredProperties = () => {
        let filtered = properties || []
        if (filter === 'rent') {
            filtered = filtered.filter(p => p.is_for_rent && !p.is_presale)
        } else if (filter === 'sale') {
            filtered = filtered.filter(p => p.is_for_sale && !p.is_presale)
        } else if (filter === 'presale') {
            filtered = filtered.filter(p => p.is_presale)
        }

        if (status !== 'all') {
            filtered = filtered.filter(p => p.status === status)
        }
        return filtered
    }

    const filteredProperties = getFilteredProperties()

    const stats = {
        total: properties?.length || 0,
        published: properties?.filter(p => p.status === 'published' || p.status === 'under_negotiation' || p.status === 'contracted').length || 0,
        unreadInquiries: inquiries?.filter(i => !i.is_read).length || 0,
    }

    return (
        <div className="lg:col-span-3 space-y-6">
            {/* Tab Switcher */}
            <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-md border border-slate-100 grid grid-cols-3 gap-1">
                <button
                    onClick={() => setTab('properties')}
                    className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${tab === 'properties'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>物件 ({stats.total})</span>
                </button>
                <button
                    onClick={() => setTab('inquiries')}
                    className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all relative text-center leading-tight ${tab === 'inquiries'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>問い合わせ ({inquiries?.length || 0})</span>
                    {stats.unreadInquiries > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[9px] sm:text-[10px] text-white ring-2 ring-white">
                            {stats.unreadInquiries}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('leads')}
                    className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${tab === 'leads'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>ログ ({leadsCount})</span>
                </button>
            </div>

            {/* スマホ: 物件タブのときだけタブ直下に登録系 CTA */}
            {tab === 'properties' && (
                <div className="md:hidden flex flex-col gap-2">
                    {activePlan === 'premium' && (
                        <Link
                            href={`/${locale}/dashboard/presale`}
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-600"
                        >
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span>プレセール投稿</span>
                        </Link>
                    )}
                    <Link
                        href={`/${locale}/list-property`}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-navy-primary shadow-md transition-all hover:bg-slate-50"
                    >
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        <span>物件を新規掲載する</span>
                    </Link>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                {tab === 'leads' ? (
                    <LeadsView initialLeads={leads} locale={locale} />
                ) : tab === 'properties' ? (
                    <>
                        <div className="p-4 sm:p-8 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-lg sm:text-xl font-black text-navy-secondary">登録物件一覧</h3>
                                <p className="text-[10px] font-medium leading-snug text-slate-500 max-w-xl">
                                    各行の LINE バッジは、その物件の問い合わせ導線の「今月」（日本時間・1日0時以降）の件数です。
                                </p>
                                <BulkConfirmButton
                                    propertyIds={filteredProperties
                                        .filter(p => p.status === 'published')
                                        .map(p => p.id)}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <div className="grid grid-cols-4 sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                                    <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'all' ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'}`}>すべて</button>
                                    <button onClick={() => setFilter('rent')} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'rent' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}>賃貸</button>
                                    <button onClick={() => setFilter('sale')} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'sale' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-orange-600'}`}>売買</button>
                                    <button onClick={() => setFilter('presale')} className={`whitespace-nowrap px-2 sm:px-6 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'presale' ? 'bg-amber-500 shadow-sm text-white' : 'text-slate-500 hover:text-amber-600'}`}>プレセール</button>
                                </div>

                                <div className="w-full sm:w-36">
                                    <StatusFilter filter={filter} status={status} onChange={(newStatus: string) => setStatus(newStatus)} />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">表示: {filteredProperties.length} / 全: {stats.total} 件</span>
                        </div>

                        {filteredProperties && filteredProperties.length > 0 ? (<>
                            {/* ── MOBILE LIST (< sm) ── */}
                            <div className="sm:hidden divide-y divide-slate-200">
                                {filteredProperties.map((property) => (
                                    <div key={property.id} className="p-3 active:bg-slate-50 transition-colors">
                                        <div className="flex gap-3">
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 shadow-sm">
                                                {property.images?.[0] ? (
                                                    <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <LayoutDashboard className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="absolute top-1 left-1">
                                                    {property.status === 'published' && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">公開</span>}
                                                    {property.status === 'pending' && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">待ち</span>}
                                                    {property.status === 'draft' && <span className="bg-slate-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">下書</span>}
                                                    {property.status === 'under_negotiation' && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">商談</span>}
                                                    {property.status === 'contracted' && <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">成約</span>}
                                                    {property.status === 'expired' && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">期限切</span>}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {property.is_presale && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-amber-200">PRESALE</span>}
                                                    {!property.is_presale && property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">RENT</span>}
                                                    {!property.is_presale && property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-100">SALE</span>}
                                                    <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                                                </div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[13px] font-black text-navy-secondary leading-tight line-clamp-2 min-w-0">{property.title}</p>
                                                    <PropertyLineInquiryBadge
                                                        count={lineInquiryCountsByPropertyThisMonth[property.id] ?? 0}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{property.area?.name || '—'}</p>
                                                <div className="text-[13px] font-black text-navy-primary mt-1 tabular-nums">
                                                    {property.is_for_rent && <span className="mr-3">{property.rent_price?.toLocaleString()} ฿/月</span>}
                                                    {property.is_for_sale && <span>{property.sale_price?.toLocaleString()} ฿</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-stretch bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <div className="flex-1 flex items-center justify-center">
                                                <DashboardActions
                                                    propertyId={property.id}
                                                    propertyTitle={property.title}
                                                    profile={profile}
                                                    property={property}
                                                    agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 px-1">
                                            <PropertyEndListingButton
                                                propertyId={property.id}
                                                currentStatus={property.status}
                                                className="flex-1"
                                            />
                                            <div className="flex-1 flex">
                                                <PropertyConfirmButton propertyId={property.id} title={property.title} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── DESKTOP ROW LIST (sm+) ── */}
                            <div className="hidden sm:block overflow-x-hidden pb-4">
                                <div className="divide-y divide-slate-200 w-full">
                                    {filteredProperties.map((property) => (
                                        <div key={property.id} className="p-4 lg:p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 lg:gap-6">
                                            <div className="flex items-center space-x-4 lg:space-x-6 min-w-0 flex-1">
                                                <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                    {property.images?.[0] ? (
                                                        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <LayoutDashboard className="w-6 h-6 lg:w-8 lg:h-8" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        {property.status === 'published' && <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">公開中</span>}
                                                        {property.status === 'pending' && <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">承認待ち</span>}
                                                        {property.status === 'draft' && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">下書き</span>}
                                                        {property.status === 'under_negotiation' && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">商談中</span>}
                                                        {property.status === 'contracted' && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold">成約済</span>}
                                                        {property.status === 'expired' && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">期限切れ</span>}
                                                        <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">#{property.id.slice(0, 8)}</span>
                                                        <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                                                        <PropertyEndListingButton propertyId={property.id} currentStatus={property.status} />
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-1 min-w-0">
                                                        <h4 className="text-sm lg:text-lg font-bold text-navy-secondary truncate min-w-0 flex-1">{property.title}</h4>
                                                        <PropertyLineInquiryBadge
                                                            count={lineInquiryCountsByPropertyThisMonth[property.id] ?? 0}
                                                            className="shrink-0"
                                                        />
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 text-xs lg:text-sm font-medium">
                                                        <span className="text-slate-400">{property.area?.name || 'Unknown Area'}</span>
                                                        {property.is_for_rent && <span className="text-navy-primary font-bold tabular-nums"><span className="text-[9px] opacity-50 uppercase mr-1">Rent</span>{property.rent_price?.toLocaleString()}</span>}
                                                        {property.is_for_sale && <span className="text-navy-primary font-bold tabular-nums"><span className="text-[9px] opacity-50 uppercase mr-1">Sale</span>{property.sale_price?.toLocaleString()}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex gap-1">
                                                    {property.is_presale ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-200">PS</span> : <>
                                                        {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 uppercase">R</span>}
                                                        {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-orange-100 uppercase">S</span>}
                                                    </>}
                                                </div>
                                                <Link href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer" className="px-2 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-100 flex items-center hidden">
                                                    <span className="hidden lg:inline">詳細</span><ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <PropertyConfirmButton propertyId={property.id} title={property.title} />
                                                <DashboardActions
                                                    propertyId={property.id}
                                                    propertyTitle={property.title}
                                                    profile={profile}
                                                    property={property}
                                                    agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>) : (
                            <div className="p-20 text-center">
                                <p className="text-slate-400 font-medium">登録されている物件はありません</p>
                            </div>
                        )}
                    </>
                ) : (
                    <InquiryList
                        initialInquiries={inquiries || []}
                        agentDisplayName={profile?.full_name ?? ''}
                    />
                )}
            </div>
        </div>
    )
}
