'use client'

import React, { useState, useEffect, useCallback, Fragment } from 'react'
import { Building2, Mail, Users, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import LeadsView from '@/components/dashboard/LeadsView'
import BulkConfirmButton from '@/components/dashboard/BulkConfirmButton'
import StatusFilter from '@/components/dashboard/StatusFilter'
import InquiryList from '@/components/dashboard/InquiryList'
import {
    DashboardMobilePropertyRow,
    DashboardDesktopPropertyRow,
} from '@/components/dashboard/DashboardPropertyRows'

const SITE_VISIBLE_STATUSES = ['published', 'under_negotiation', 'contracted'] as const

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
    const [properties, setProperties] = useState(initialProperties)
    const [inquiries] = useState(initialInquiries)
    const [leads] = useState(initialLeads || [])

    useEffect(() => {
        setProperties(initialProperties)
    }, [initialProperties])

    const patchProperty = useCallback((id: string, patch: Record<string, unknown>) => {
        setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    }, [])

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
    const liveFiltered = filteredProperties.filter((p) =>
        SITE_VISIBLE_STATUSES.includes(p.status as (typeof SITE_VISIBLE_STATUSES)[number])
    )
    const otherFiltered = filteredProperties.filter(
        (p) => !SITE_VISIBLE_STATUSES.includes(p.status as (typeof SITE_VISIBLE_STATUSES)[number])
    )
    const showSectionTitles = status === 'all'

    const propertySections = [
        {
            key: 'live',
            items: liveFiltered,
            title: 'サイトに掲載中',
            subtitle: '公開・商談中・成約済の物件です。掲載終了で下のエリアへ移動します。',
            headClass: 'border-b border-slate-100 bg-slate-50',
        },
        {
            key: 'other',
            items: otherFiltered,
            title: '下書き・承認待ち・その他',
            subtitle: '下書きは「再公開する」でサイト掲載に戻せます。',
            headClass: `${liveFiltered.length > 0 ? 'border-t-2 border-slate-200 ' : ''}border-b border-slate-100 bg-slate-50/95`,
        },
    ] as const

    const rowProps = {
        profile,
        lineInquiryCountsByPropertyThisMonth,
        patchProperty,
    }

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
                                    propertyIds={liveFiltered
                                        .filter((p) => p.status === 'published')
                                        .map((p) => p.id)}
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

                        {filteredProperties.length > 0 ? (
                            <>
                                {propertySections.map((section) =>
                                    section.items.length === 0 ? null : (
                                        <Fragment key={section.key}>
                                            {showSectionTitles && (
                                                <div className={`px-4 py-3 sm:px-8 ${section.headClass}`}>
                                                    <h4 className="text-xs font-black text-navy-secondary sm:text-sm">{section.title}</h4>
                                                    <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500 max-w-xl">
                                                        {section.subtitle}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="sm:hidden divide-y divide-slate-200">
                                                {section.items.map((property) => (
                                                    <DashboardMobilePropertyRow
                                                        key={property.id}
                                                        property={property}
                                                        {...rowProps}
                                                    />
                                                ))}
                                            </div>
                                            <div className="hidden sm:block overflow-x-hidden pb-4">
                                                <div className="divide-y divide-slate-200 w-full">
                                                    {section.items.map((property) => (
                                                        <DashboardDesktopPropertyRow
                                                            key={property.id}
                                                            property={property}
                                                            {...rowProps}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </Fragment>
                                    )
                                )}
                            </>
                        ) : (
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
