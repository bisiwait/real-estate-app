'use client'

import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react'
import { Building2, Mail, Users, PlusCircle, UserCircle, ArrowDownWideNarrow } from 'lucide-react'
import Link from 'next/link'
import LeadsView from '@/components/dashboard/LeadsView'
import BulkConfirmButton from '@/components/dashboard/BulkConfirmButton'
import StatusFilter from '@/components/dashboard/StatusFilter'
import InquiryList from '@/components/dashboard/InquiryList'
import AgentProfileContactsView from '@/components/dashboard/AgentProfileContactsView'
import type { AgentProfileContactRow } from '@/lib/supabase/fetch-agent-profile-contacts'
import {
    DashboardMobilePropertyRow,
    DashboardDesktopPropertyRow,
} from '@/components/dashboard/DashboardPropertyRows'
import {
    isAgentDashboardPriceSortAllowed,
    sortAgentDashboardProperties,
    type AgentDashboardPropertySort,
} from '@/lib/dashboard/sort-agent-properties'

const SITE_VISIBLE_STATUSES = ['published'] as const

interface DashboardClientProps {
    initialTab: string
    initialFilter: string
    initialStatus: string
    profile: any
    initialProperties: any[]
    initialInquiries: any[]
    initialLeads: any[]
    leadsCount: number
    initialProfileContacts: AgentProfileContactRow[]
    profileContactsUnhandledCount: number
    profileContactsFetchError: string | null
    locale: string
    activePlan: string
    /** 日本時間・今月1日0時以降の line_inquiry_counts を物件 id ごとに集計 */
    lineInquiryCountsByPropertyThisMonth: Record<string, number>
    dict: any
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
    initialProfileContacts,
    profileContactsUnhandledCount,
    profileContactsFetchError,
    locale,
    activePlan,
    lineInquiryCountsByPropertyThisMonth,
    dict,
}: DashboardClientProps) {
    const [tab, setTab] = useState(initialTab)
    const [filter, setFilter] = useState(initialFilter)
    const [status, setStatus] = useState(initialStatus)
    const [sort, setSort] = useState<AgentDashboardPropertySort>('newest')
    const [properties, setProperties] = useState(initialProperties)
    const [inquiries] = useState(initialInquiries)
    const [leads] = useState(initialLeads || [])

    useEffect(() => {
        setProperties(initialProperties)
    }, [initialProperties])

    const patchProperty = useCallback((id: string, patch: Record<string, unknown>) => {
        setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    }, [])

    const priceSortEnabled = isAgentDashboardPriceSortAllowed(filter)

    useEffect(() => {
        if (!priceSortEnabled && (sort === 'price_asc' || sort === 'price_desc')) {
            setSort('newest')
        }
    }, [priceSortEnabled, sort])

    const filteredProperties = useMemo(() => {
        let filtered = properties || []
        if (filter === 'rent') {
            filtered = filtered.filter((p) => p.is_for_rent && !p.is_presale)
        } else if (filter === 'sale') {
            filtered = filtered.filter((p) => p.is_for_sale && !p.is_presale)
        } else if (filter === 'presale') {
            filtered = filtered.filter((p) => p.is_presale)
        }

        if (status !== 'all') {
            filtered = filtered.filter((p) => p.status === status)
        }

        return sortAgentDashboardProperties(filtered, sort, filter)
    }, [properties, filter, status, sort])
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
            title: dict.property_section_live_title,
            subtitle: dict.property_section_live_subtitle,
            headClass: 'border-b border-slate-100 bg-slate-50',
        },
        {
            key: 'other',
            items: otherFiltered,
            title: dict.property_section_other_title,
            subtitle: dict.property_section_other_subtitle,
            headClass: `${liveFiltered.length > 0 ? 'border-t-2 border-slate-200 ' : ''}border-b border-slate-100 bg-slate-50/95`,
        },
    ] as const

    const rowProps = {
        profile,
        lineInquiryCountsByPropertyThisMonth,
        patchProperty,
        locale,
        dict,
    }

    const stats = {
        total: properties?.length || 0,
        published: properties?.filter(p => p.status === 'published').length || 0,
        unreadInquiries: inquiries?.filter(i => !i.is_read).length || 0,
    }

    return (
        <div className="lg:col-span-3 space-y-6">
            {/* Tab Switcher */}
            <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-md border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1">
                <button
                    onClick={() => setTab('properties')}
                    className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${tab === 'properties'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{dict.tab_properties.replace('{count}', String(stats.total))}</span>
                </button>
                <button
                    onClick={() => setTab('inquiries')}
                    className={`flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all relative text-center leading-tight ${tab === 'inquiries'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{dict.tab_inquiries.replace('{count}', String(inquiries?.length || 0))}</span>
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
                    <span>{dict.tab_logs.replace('{count}', String(leadsCount))}</span>
                </button>
                <button
                    onClick={() => setTab('profile_contacts')}
                    className={`relative flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center leading-tight ${tab === 'profile_contacts'
                        ? 'bg-navy-primary text-white shadow-lg'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <UserCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{dict.tab_profile}</span>
                    {profileContactsUnhandledCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[9px] sm:text-[10px] text-white ring-2 ring-white">
                            {profileContactsUnhandledCount > 99 ? '99+' : profileContactsUnhandledCount}
                        </span>
                    )}
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
                            <span>{dict.cta_presale_post}</span>
                        </Link>
                    )}
                    <Link
                        href={`/${locale}/list-property`}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-navy-primary shadow-md transition-all hover:bg-slate-50"
                    >
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        <span>{dict.cta_new_listing}</span>
                    </Link>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                {tab === 'leads' ? (
                    <LeadsView initialLeads={leads} locale={locale} dict={dict} />
                ) : tab === 'profile_contacts' ? (
                    <AgentProfileContactsView
                        initialRows={initialProfileContacts}
                        fetchError={profileContactsFetchError}
                        agentDisplayName={profile?.full_name ?? ''}
                        dict={dict}
                        locale={locale}
                    />
                ) : tab === 'properties' ? (
                    <>
                        <div className="border-b border-slate-200 p-4 sm:p-8">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
                                    <h3 className="shrink-0 text-lg sm:text-xl font-black text-navy-secondary">
                                        {dict.property_list_title}
                                    </h3>
                                    <BulkConfirmButton
                                        dict={dict}
                                        className="shrink-0"
                                        propertyIds={liveFiltered
                                            .filter((p) => p.status === 'published')
                                            .map((p) => p.id)}
                                    />
                                </div>
                                <p className="shrink-0 text-xs font-bold text-slate-400">
                                    {dict.display_count
                                        .replace('{shown}', String(filteredProperties.length))
                                        .replace('{total}', String(stats.total))}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">
                                <div className="grid min-w-0 w-full grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 lg:max-w-xl lg:flex-1">
                                    <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'all' ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'}`}>{dict.filter_all}</button>
                                    <button onClick={() => setFilter('rent')} className={`whitespace-nowrap px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'rent' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}>{dict.filter_rent}</button>
                                    <button onClick={() => setFilter('sale')} className={`whitespace-nowrap px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'sale' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-orange-600'}`}>{dict.filter_sale}</button>
                                    <button onClick={() => setFilter('presale')} className={`whitespace-nowrap px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center ${filter === 'presale' ? 'bg-amber-500 shadow-sm text-white' : 'text-slate-500 hover:text-amber-600'}`}>{dict.filter_presale}</button>
                                </div>

                                <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-[9.5rem_11.5rem]">
                                    <StatusFilter filter={filter} status={status} onChange={(newStatus: string) => setStatus(newStatus)} dict={dict} />
                                    <label htmlFor="dashboard-property-sort" className="relative block min-w-0 w-full">
                                        <span className="sr-only">{dict.sort_label}</span>
                                        <ArrowDownWideNarrow
                                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                            aria-hidden
                                        />
                                        <select
                                            id="dashboard-property-sort"
                                            value={sort}
                                            onChange={(e) => setSort(e.target.value as AgentDashboardPropertySort)}
                                            className="w-full min-w-0 appearance-none truncate rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-bold text-navy-secondary shadow-sm focus:border-navy-primary focus:outline-none focus:ring-2 focus:ring-navy-primary/20"
                                            aria-label={dict.sort_label}
                                        >
                                            <option value="newest">{dict.sort_newest}</option>
                                            <option value="oldest">{dict.sort_oldest}</option>
                                            <option value="price_asc" disabled={!priceSortEnabled}>
                                                {dict.sort_price_asc}
                                            </option>
                                            <option value="price_desc" disabled={!priceSortEnabled}>
                                                {dict.sort_price_desc}
                                            </option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden>
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </div>
                                    </label>
                                </div>
                            </div>
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
                                <p className="text-slate-400 font-medium">{dict.no_properties}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <InquiryList
                        initialInquiries={inquiries || []}
                        agentDisplayName={profile?.full_name ?? ''}
                        locale={locale}
                        dict={dict}
                    />
                )}
            </div>
        </div>
    )
}
