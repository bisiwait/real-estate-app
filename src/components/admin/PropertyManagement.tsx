'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { maxPageForCount } from '@/lib/admin-list-url'
import {
    ADMIN_PROP_AREA,
    ADMIN_PROP_DEVELOPER_ID,
    ADMIN_PROP_LIST_FILTER,
    ADMIN_PROP_MAX_PRICE,
    ADMIN_PROP_MIN_PRICE,
    ADMIN_PROP_PROPERTY_TYPE,
    ADMIN_PROP_SEARCH,
    ADMIN_PROP_SEARCH_DEBOUNCE_MS,
    parseAdminPropListFilter,
    parseOptionalPositiveNumber,
    parseOptionalUuid,
} from '@/lib/admin-property-list-url'
import {
    ADMIN_PROPERTY_TYPE_VALUES,
    fetchAdminPropertiesPage,
    resolveAdminPropertyAreaFilter,
} from '@/lib/supabase/admin-properties-list-query'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import AdminRowsPerPageSelect from '@/components/admin/AdminRowsPerPageSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getPropertyTypeOptionLabel } from '@/lib/property-type-i18n'
import {
    X,
    Trash2,
    ExternalLink,
    AlertCircle,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    ChevronDown,
    SlidersHorizontal,
    CircleDollarSign,
    ImageOff,
    Building2,
    FileWarning,
    Copy,
    Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import PropertyThumbnail from '@/components/property/PropertyThumbnail'
import AdminPropertyListSkeleton from '@/components/admin/AdminPropertyListSkeleton'
import AdminHoverTip from '@/components/admin/AdminHoverTip'
import {
    ADMIN_PROPERTY_MIN_DESCRIPTION_CHARS,
    getAdminPropertyQualityFlags,
    shouldRecommendDeveloperForProperty,
} from '@/lib/admin/property-quality'
import { shouldAuditStorageImageUrl, verifyPublicImageUrlReachable } from '@/lib/admin/verify-property-image-url'
import { fetchAdminDuplicateTitlesOnPage } from '@/lib/supabase/admin-duplicate-titles'
import { cn } from '@/lib/utils'


type AreaRow = { id: string; name: string; slug: string }

type AdminQualityStatsRow = {
    missing_price?: number
    missing_image?: number
    no_developer?: number
    short_description?: number
    any_issue?: number
}

export default function AdminPropertyManagement() {
    const searchParams = useSearchParams()
    const [properties, setProperties] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({})
    /** 一覧の Supabase 取得中（ページ・フィルタ変更時）。UI はスケルトンで応答性を維持 */
    const [listFetchBusy, setListFetchBusy] = useState(true)
    /** 承認・削除などミューテーション中（一覧と重ならないよう別フラグ） */
    const [mutationBusy, setMutationBusy] = useState(false)
    const listRequestIdRef = useRef(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState<number | null>(null)
    const [areas, setAreas] = useState<AreaRow[]>([])
    const [developers, setDevelopers] = useState<{ id: string; name: string }[]>([])
    const [filterPanelOpen, setFilterPanelOpen] = useState(true)
    const [qualityStats, setQualityStats] = useState<AdminQualityStatsRow | null>(null)
    const [duplicateTitleSet, setDuplicateTitleSet] = useState<Set<string>>(() => new Set())
    /** メイン画像 URL が Supabase Storage 上で参照不能（404 等）と判定された物件 id */
    const [brokenStorageImageIds, setBrokenStorageImageIds] = useState<Set<string>>(() => new Set())
    const supabase = createClient()
    const { limit, page, setPage, setLimit, replaceQuery } = useAdminTablePagination()

    const filter = useMemo(
        () => parseAdminPropListFilter(searchParams.get(ADMIN_PROP_LIST_FILTER)),
        [searchParams]
    )

    const urlSearch = (searchParams.get(ADMIN_PROP_SEARCH) ?? '').trim()
    const areaSlug = (searchParams.get(ADMIN_PROP_AREA) ?? '').trim()
    const propertyTypeParam = (searchParams.get(ADMIN_PROP_PROPERTY_TYPE) ?? '').trim()
    const developerIdParam = parseOptionalUuid(searchParams.get(ADMIN_PROP_DEVELOPER_ID))
    const minPriceUrl = parseOptionalPositiveNumber(searchParams.get(ADMIN_PROP_MIN_PRICE))
    const maxPriceUrl = parseOptionalPositiveNumber(searchParams.get(ADMIN_PROP_MAX_PRICE))

    const [draftSearch, setDraftSearch] = useState(urlSearch)
    useEffect(() => {
        setDraftSearch(urlSearch)
    }, [urlSearch])

    useEffect(() => {
        const t = window.setTimeout(() => {
            const next = draftSearch.trim()
            if (next === urlSearch) return
            replaceQuery((p) => {
                if (next) p.set(ADMIN_PROP_SEARCH, next)
                else p.delete(ADMIN_PROP_SEARCH)
                p.delete('page')
            })
        }, ADMIN_PROP_SEARCH_DEBOUNCE_MS)
        return () => window.clearTimeout(t)
    }, [draftSearch, replaceQuery, urlSearch])

    const [minPriceDraft, setMinPriceDraft] = useState('')
    const [maxPriceDraft, setMaxPriceDraft] = useState('')
    useEffect(() => {
        setMinPriceDraft(minPriceUrl != null ? String(minPriceUrl) : '')
        setMaxPriceDraft(maxPriceUrl != null ? String(maxPriceUrl) : '')
    }, [minPriceUrl, maxPriceUrl])

    const commitPriceRange = useCallback(() => {
        const minN = parseOptionalPositiveNumber(minPriceDraft)
        const maxN = parseOptionalPositiveNumber(maxPriceDraft)
        replaceQuery((p) => {
            if (minN != null) p.set(ADMIN_PROP_MIN_PRICE, String(Math.floor(minN)))
            else p.delete(ADMIN_PROP_MIN_PRICE)
            if (maxN != null) p.set(ADMIN_PROP_MAX_PRICE, String(Math.floor(maxN)))
            else p.delete(ADMIN_PROP_MAX_PRICE)
            p.delete('page')
        })
    }, [maxPriceDraft, minPriceDraft, replaceQuery])

    const areaResolved = useMemo(() => resolveAdminPropertyAreaFilter(areaSlug, areas), [areaSlug, areas])

    const agentIdSet = useMemo(() => new Set(users.map((u) => u.id)), [users])

    const setListFilter = useCallback(
        (next: ReturnType<typeof parseAdminPropListFilter>) => {
            replaceQuery((p) => {
                if (next === 'all') p.delete(ADMIN_PROP_LIST_FILTER)
                else p.set(ADMIN_PROP_LIST_FILTER, next)
                p.delete('page')
            })
        },
        [replaceQuery]
    )

    const setAreaSlug = useCallback(
        (slug: string) => {
            replaceQuery((p) => {
                if (slug) p.set(ADMIN_PROP_AREA, slug)
                else p.delete(ADMIN_PROP_AREA)
                p.delete('page')
            })
        },
        [replaceQuery]
    )

    const setPropertyTypeFilter = useCallback(
        (value: string) => {
            replaceQuery((p) => {
                if (value) p.set(ADMIN_PROP_PROPERTY_TYPE, value)
                else p.delete(ADMIN_PROP_PROPERTY_TYPE)
                p.delete('page')
            })
        },
        [replaceQuery]
    )

    const setDeveloperFilter = useCallback(
        (id: string) => {
            replaceQuery((p) => {
                if (id) p.set(ADMIN_PROP_DEVELOPER_ID, id)
                else p.delete(ADMIN_PROP_DEVELOPER_ID)
                p.delete('page')
            })
        },
        [replaceQuery]
    )

    const clearAdvancedFilters = useCallback(() => {
        replaceQuery((p) => {
            p.delete(ADMIN_PROP_SEARCH)
            p.delete(ADMIN_PROP_AREA)
            p.delete(ADMIN_PROP_MIN_PRICE)
            p.delete(ADMIN_PROP_MAX_PRICE)
            p.delete(ADMIN_PROP_PROPERTY_TYPE)
            p.delete(ADMIN_PROP_DEVELOPER_ID)
            p.delete('page')
        })
        setDraftSearch('')
        setMinPriceDraft('')
        setMaxPriceDraft('')
    }, [replaceQuery])

    const fetchAgentProfiles = useCallback(async () => {
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('user_role', 'agent')
            .is('deleted_at', null)
            .order('full_name')

        if (!profilesError && profilesData) {
            setUsers(profilesData)
        }
    }, [supabase])

    const refreshQualityStats = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_property_quality_stats')
        if (error) {
            console.warn('[admin properties] quality stats', error.message)
            return
        }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            setQualityStats(data as AdminQualityStatsRow)
        }
    }, [supabase])

    const fetchAreasAndDevelopers = useCallback(async () => {
        const [{ data: areaRows, error: areaErr }, { data: devRows, error: devErr }] = await Promise.all([
            supabase.from('areas').select('id, name, slug').order('name'),
            supabase.from('developers').select('id, name').order('name'),
        ])
        if (!areaErr && areaRows) setAreas(areaRows as AreaRow[])
        if (!devErr && devRows) setDevelopers(devRows as { id: string; name: string }[])
    }, [supabase])

    const fetchPropertiesPage = useCallback(async () => {
        if (areaResolved.kind === 'wait_areas' && areaSlug.trim()) {
            setListFetchBusy(true)
            return
        }

        const reqId = ++listRequestIdRef.current
        setListFetchBusy(true)
        setErrorMessage(null)
        try {
            const { rows, count, error } = await fetchAdminPropertiesPage(supabase, {
                listFilter: filter,
                urlSearch,
                area: areaResolved,
                propertyTypeParam,
                developerIdParam,
                minPriceUrl,
                maxPriceUrl,
                page,
                limit,
            })

            if (reqId !== listRequestIdRef.current) return

            if (error) {
                console.error('Fetch properties error:', error)
                setErrorMessage(getErrorMessage(error))
                setProperties([])
                setTotalCount(0)
                return
            }

            setProperties(rows as any[])
            setTotalCount(count ?? 0)
        } finally {
            if (reqId === listRequestIdRef.current) {
                setListFetchBusy(false)
            }
        }
    }, [
        supabase,
        filter,
        urlSearch,
        page,
        limit,
        areaSlug,
        areaResolved,
        propertyTypeParam,
        developerIdParam,
        minPriceUrl,
        maxPriceUrl,
    ])

    useEffect(() => {
        void fetchAgentProfiles()
    }, [fetchAgentProfiles])

    useEffect(() => {
        void fetchAreasAndDevelopers()
    }, [fetchAreasAndDevelopers])

    useEffect(() => {
        void fetchPropertiesPage()
    }, [fetchPropertiesPage])

    useEffect(() => {
        void refreshQualityStats()
    }, [refreshQualityStats])

    useEffect(() => {
        if (listFetchBusy || properties.length === 0) {
            setDuplicateTitleSet(new Set())
            return
        }
        let cancelled = false
        const titles = properties.map((p: { title?: string }) => String(p.title ?? ''))
        void (async () => {
            const dup = await fetchAdminDuplicateTitlesOnPage(supabase, titles)
            if (!cancelled) setDuplicateTitleSet(dup)
        })()
        return () => {
            cancelled = true
        }
    }, [listFetchBusy, properties, supabase])

    useEffect(() => {
        if (listFetchBusy || properties.length === 0) {
            setBrokenStorageImageIds(new Set())
            return
        }
        const ac = new AbortController()
        const urlToPropertyIds = new Map<string, Set<string>>()
        for (const p of properties) {
            const url = String(p.images?.[0] ?? '').trim()
            if (!url || !shouldAuditStorageImageUrl(url)) continue
            if (!urlToPropertyIds.has(url)) urlToPropertyIds.set(url, new Set())
            urlToPropertyIds.get(url)!.add(String(p.id))
        }
        void (async () => {
            const brokenIds = new Set<string>()
            for (const [url, ids] of urlToPropertyIds) {
                if (ac.signal.aborted) return
                const ok = await verifyPublicImageUrlReachable(url, ac.signal)
                if (!ok) ids.forEach((id) => brokenIds.add(id))
            }
            if (!ac.signal.aborted) setBrokenStorageImageIds(brokenIds)
        })()
        return () => ac.abort()
    }, [listFetchBusy, properties])

    useEffect(() => {
        if (totalCount === null) return
        const maxP = maxPageForCount(totalCount, limit)
        if (page > maxP) setPage(maxP)
    }, [totalCount, limit, page, setPage])

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'restore') => {
        if (action === 'delete') {
            if (!confirm('削除しますか？この処理をすると戻せません。')) return
        }

        setMutationBusy(true)
        try {
            if (action === 'approve') {
                await supabase.from('properties').update({ is_approved: true, status: 'published' }).eq('id', id)
            } else if (action === 'restore') {
                // "Restore" action: set back to published and ensure approved
                await supabase.from('properties').update({ is_approved: true, status: 'published' }).eq('id', id)
            } else if (action === 'reject') {
                // "Hide" action: set to draft and unapprove
                await supabase.from('properties').update({ is_approved: false, status: 'draft' }).eq('id', id)
            } else if (action === 'delete') {
                await supabase.from('properties').delete().eq('id', id)
            }
            await fetchPropertiesPage()
            await refreshQualityStats()
        } catch (err: any) {
            console.error('Admin action error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setMutationBusy(false)
        }
    }

    const handleAssignUser = async (id: string, newUserId: string) => {
        if (!confirm('掲載エージェントを変更しますか？')) return

        setMutationBusy(true)
        try {
            const { error } = await supabase.from('properties').update({ user_id: newUserId || null }).eq('id', id)
            if (error) throw error
            await fetchPropertiesPage()
            await refreshQualityStats()
            setSelectedUsers(prev => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Assign user error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setMutationBusy(false)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setMutationBusy(true)
        try {
            const updates: any = { status: newStatus }
            if (newStatus === 'published') {
                updates.is_approved = true
            } else if (newStatus === 'draft') {
                updates.is_approved = false
            }
            const { error } = await supabase.from('properties').update(updates).eq('id', id)
            if (error) throw error
            await fetchPropertiesPage()
            await refreshQualityStats()
            setSelectedStatuses((prev: Record<string, string>) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Status change error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setMutationBusy(false)
        }
    }

    const totalPages =
        totalCount !== null && totalCount > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1
    const fromRow = totalCount === 0 ? 0 : (page - 1) * limit + 1
    const toRow = totalCount === null ? 0 : Math.min(page * limit, totalCount)

    const adminLocale = 'jp'
    const hasAdvancedFilters =
        Boolean(urlSearch) ||
        Boolean(areaSlug) ||
        minPriceUrl != null ||
        maxPriceUrl != null ||
        Boolean(propertyTypeParam) ||
        Boolean(developerIdParam)

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-2 md:p-8 flex flex-col gap-4 md:gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg md:text-xl font-black text-navy-secondary">物件承認・管理</h2>
                            {(totalCount !== null || listFetchBusy) && (
                                <span
                                    className={cn(
                                        'bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold',
                                        listFetchBusy && 'animate-pulse opacity-80'
                                    )}
                                >
                                    {totalCount === null ? '…' : `${totalCount}件`}
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Property Management
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFilterPanelOpen((o) => !o)}
                            className="h-10 border-slate-200 bg-white text-xs font-bold text-navy-secondary shadow-sm hover:bg-slate-50"
                            aria-expanded={filterPanelOpen}
                        >
                            <SlidersHorizontal className="mr-2 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                            検索・フィルタ
                            <ChevronDown
                                className={cn(
                                    'ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                                    filterPanelOpen && 'rotate-180'
                                )}
                                aria-hidden
                            />
                        </Button>
                        <AdminRowsPerPageSelect
                            id="admin-properties-limit"
                            value={limit}
                            onChange={setLimit}
                            className="sm:min-w-[140px]"
                        />
                    </div>
                </div>

                {qualityStats != null && typeof qualityStats.any_issue === 'number' ? (
                    <div className="rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-xs text-amber-950 shadow-sm md:px-5 md:py-4">
                        <p className="font-black text-navy-secondary">
                            要修正物件：{qualityStats.any_issue} 件
                        </p>
                        <p className="mt-1 font-bold leading-relaxed text-amber-900/95">
                            画像なし {qualityStats.missing_image ?? 0} 件、価格なし（price 未設定） {qualityStats.missing_price ?? 0} 件、デベロッパー未設定{' '}
                            {qualityStats.no_developer ?? 0} 件、説明不足（{ADMIN_PROPERTY_MIN_DESCRIPTION_CHARS} 文字以下・日英泰の最大）{' '}
                            {qualityStats.short_description ?? 0} 件
                        </p>
                        <p className="mt-1 text-[10px] font-bold leading-relaxed text-amber-900/75">
                            全物件を対象に DB 側で集計しています（承認タブの絞り込みは反映されません）。画像 URL
                            の実体確認は一覧の現在ページのみ HTTP で行います（CSV 直投入などの整合性確認用）。
                        </p>
                    </div>
                ) : null}

                {filterPanelOpen ? (
                    <div
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
                        role="region"
                        aria-label="物件一覧の検索・フィルタ"
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="md:col-span-2 xl:col-span-1">
                                <label htmlFor="admin-prop-search" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    フリーワード
                                </label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        id="admin-prop-search"
                                        placeholder="物件名・説明・エージェント名など"
                                        value={draftSearch}
                                        onChange={(e) => setDraftSearch(e.target.value)}
                                        className="h-10 pl-9 pr-9 text-xs font-bold"
                                        autoComplete="off"
                                    />
                                    {draftSearch ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftSearch('')
                                                replaceQuery((p) => {
                                                    p.delete(ADMIN_PROP_SEARCH)
                                                    p.delete('page')
                                                })
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            aria-label="検索語をクリア"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="admin-prop-area" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    エリア
                                </label>
                                <Select
                                    id="admin-prop-area"
                                    value={areaSlug && areas.some((a) => a.slug === areaSlug) ? areaSlug : ''}
                                    onChange={(e) => setAreaSlug(e.target.value)}
                                    className="text-xs font-bold"
                                >
                                    <option value="">すべて</option>
                                    {areas.map((a) => (
                                        <option key={a.id} value={a.slug}>
                                            {a.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="admin-prop-type" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    物件タイプ
                                </label>
                                <Select
                                    id="admin-prop-type"
                                    value={
                                        ADMIN_PROPERTY_TYPE_VALUES.includes(
                                            propertyTypeParam as (typeof ADMIN_PROPERTY_TYPE_VALUES)[number]
                                        )
                                            ? propertyTypeParam
                                            : ''
                                    }
                                    onChange={(e) => setPropertyTypeFilter(e.target.value)}
                                    className="text-xs font-bold"
                                >
                                    <option value="">すべて</option>
                                    {ADMIN_PROPERTY_TYPE_VALUES.map((v) => (
                                        <option key={v} value={v}>
                                            {getPropertyTypeOptionLabel(v, adminLocale)}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="admin-prop-developer" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    デベロッパー
                                </label>
                                <Select
                                    id="admin-prop-developer"
                                    value={developerIdParam && developers.some((d) => d.id === developerIdParam) ? developerIdParam : ''}
                                    onChange={(e) => setDeveloperFilter(e.target.value)}
                                    className="text-xs font-bold"
                                >
                                    <option value="">すべて</option>
                                    {developers.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="md:col-span-2 xl:col-span-2">
                                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    価格帯（list_sort_price・バーツ）
                                </span>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="min-w-[120px] flex-1">
                                        <label htmlFor="admin-prop-minp" className="sr-only">
                                            最低価格
                                        </label>
                                        <Input
                                            id="admin-prop-minp"
                                            inputMode="numeric"
                                            placeholder="最安"
                                            value={minPriceDraft}
                                            onChange={(e) => setMinPriceDraft(e.target.value)}
                                            onBlur={commitPriceRange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                            }}
                                            className="text-xs font-bold"
                                        />
                                    </div>
                                    <span className="pb-2 text-xs font-bold text-slate-400">〜</span>
                                    <div className="min-w-[120px] flex-1">
                                        <label htmlFor="admin-prop-maxp" className="sr-only">
                                            最高価格
                                        </label>
                                        <Input
                                            id="admin-prop-maxp"
                                            inputMode="numeric"
                                            placeholder="最高"
                                            value={maxPriceDraft}
                                            onChange={(e) => setMaxPriceDraft(e.target.value)}
                                            onBlur={commitPriceRange}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                            }}
                                            className="text-xs font-bold"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={commitPriceRange}
                                        className="h-10 shrink-0 border-slate-200 bg-slate-50 text-xs font-bold text-navy-secondary hover:bg-slate-100"
                                    >
                                        価格を反映
                                    </Button>
                                </div>
                                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                                    一覧ソート用の換算価格に対して絞り込みます。入力後はフォーカスを外すか「価格を反映」を押してください。
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!hasAdvancedFilters}
                                onClick={clearAdvancedFilters}
                                className="h-9 border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                                フィルタをクリア
                            </Button>
                        </div>
                    </div>
                ) : null}

                <div className="flex w-full items-center overflow-hidden">
                    <div className="flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex-nowrap sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setListFilter('all')}
                            className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-[10px] font-bold transition-all sm:flex-none sm:px-4 md:text-xs ${filter === 'all' ? 'bg-navy-primary text-white shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                        >
                            すべて
                        </button>
                        <button
                            type="button"
                            onClick={() => setListFilter('pending')}
                            className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-[10px] font-bold transition-all sm:flex-none sm:px-4 md:text-xs ${filter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-500'}`}
                        >
                            承認待ち
                        </button>
                        <button
                            type="button"
                            onClick={() => setListFilter('active')}
                            className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-[10px] font-bold transition-all sm:flex-none sm:px-4 md:text-xs ${filter === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
                        >
                            公開中
                        </button>
                        <button
                            type="button"
                            onClick={() => setListFilter('draft')}
                            className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-[10px] font-bold transition-all sm:flex-none sm:px-4 md:text-xs ${filter === 'draft' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            下書き
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-2 md:p-8">
                {errorMessage && (
                    <div className="px-4 py-3 bg-red-50 text-red-600 text-xs font-bold text-center">
                        エラーが発生しました: {errorMessage}
                    </div>
                )}
                {listFetchBusy ? (
                    <AdminPropertyListSkeleton rows={Math.min(limit, 10)} />
                ) : totalCount === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Filter className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">表示する物件がありません</p>
                    </div>
                ) : (
                    <div className="relative">
                    {duplicateTitleSet.size > 0 ? (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900">
                            このページには<strong className="mx-0.5">物件名（title）が完全一致</strong>する行が含まれています。CSV
                            インポートやコピー登録の重複がないか確認してください。
                        </div>
                    ) : null}
                    {properties.map((property) => {
                        const currentStatus = selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status
                        const qf = getAdminPropertyQualityFlags(property)
                        const titleDup = duplicateTitleSet.has(String(property.title ?? ''))
                        const brokenStorage = brokenStorageImageIds.has(String(property.id))
                        const devRecommend = shouldRecommendDeveloperForProperty(property)
                        const auditImportRed = Boolean(qf.noDeveloper || brokenStorage || titleDup)
                        return (
                            <div key={property.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                                {/* Mobile & Desktop unified layout */}
                                <div className="flex gap-3 md:gap-4">
                                    {/* Image */}
                                    <div
                                        className={cn(
                                            'relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm',
                                            brokenStorage && 'ring-2 ring-red-500 ring-offset-1'
                                        )}
                                    >
                                        {property.images?.[0] ? (
                                            <PropertyThumbnail
                                                src={property.images[0]}
                                                alt=""
                                                fill
                                                sizes="(max-width: 767px) 64px, 80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                            {property.is_presale && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-amber-200">PRESALE</span>}
                                            {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-indigo-100">RENT</span>}
                                            {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-orange-100">SALE</span>}
                                            {/* Status badge */}
                                            {property.status === 'published' && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black">公開中</span>}
                                            {property.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black">承認待ち</span>}
                                            {property.status === 'draft' && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">下書き</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p
                                                className={cn(
                                                    'min-w-0 flex-1 truncate text-sm font-black',
                                                    auditImportRed ? 'text-red-600' : 'text-navy-secondary'
                                                )}
                                            >
                                                {property.title}
                                            </p>
                                            <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
                                                {qf.missingPrice ? (
                                                    <AdminHoverTip tip="DB の price が 0 または未設定です。賃料・売価とは別列のため、必要に応じて price を入力してください。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-black text-amber-800"
                                                        >
                                                            <CircleDollarSign className="h-3 w-3 shrink-0" aria-hidden />
                                                            価格
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {qf.missingImage ? (
                                                    <AdminHoverTip tip="画像が未設定か、先頭画像が空です。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[8px] font-black text-slate-700"
                                                        >
                                                            <ImageOff className="h-3 w-3 shrink-0" aria-hidden />
                                                            画像
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {qf.noDeveloper ? (
                                                    <AdminHoverTip tip="developer_id が未設定です。CSV 直インポート時に抜けやすい項目です。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-0.5 text-[8px] font-black text-red-700"
                                                        >
                                                            <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                                                            Dev未設定
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {brokenStorage ? (
                                                    <AdminHoverTip tip="メイン画像の URL は Supabase Storage 形式ですが、HTTP 応答が失敗しました。オブジェクト削除・URL 誤り・別プロジェクトの URL など CSV 取り込み不整合の可能性があります。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-0.5 text-[8px] font-black text-red-700"
                                                        >
                                                            <ImageOff className="h-3 w-3 shrink-0" aria-hidden />
                                                            画像URL
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {devRecommend ? (
                                                    <AdminHoverTip tip="物件名に Riviera が含まれています。developer_id の設定を推奨します。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-[8px] font-black text-indigo-800"
                                                        >
                                                            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                                            デベロッパー設定を推奨
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {qf.shortDescription ? (
                                                    <AdminHoverTip
                                                        tip={`説明文（日本語・英語・タイ語のいずれかの最大長）が ${ADMIN_PROPERTY_MIN_DESCRIPTION_CHARS} 文字以下です。`}
                                                    >
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-sky-200 bg-sky-50 px-1 py-0.5 text-[8px] font-black text-sky-800"
                                                        >
                                                            <FileWarning className="h-3 w-3 shrink-0" aria-hidden />
                                                            説明
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                                {titleDup ? (
                                                    <AdminHoverTip tip="DB 上で同じ物件名（title）の行が複数あります。CSV インポートや手入力の重複を疑ってください。">
                                                        <span
                                                            tabIndex={0}
                                                            className="inline-flex items-center gap-0.5 rounded border border-red-300 bg-red-50 px-1 py-0.5 text-[8px] font-black text-red-700"
                                                        >
                                                            <Copy className="h-3 w-3 shrink-0" aria-hidden />
                                                            物件名重複
                                                        </span>
                                                    </AdminHoverTip>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-1 flex flex-wrap items-center gap-2',
                                                auditImportRed && 'text-red-600'
                                            )}
                                        >
                                            {property.is_for_rent && property.rent_price && (
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold',
                                                        auditImportRed ? 'text-red-600' : 'text-indigo-600'
                                                    )}
                                                >
                                                    {property.rent_price.toLocaleString()} ฿/月
                                                </span>
                                            )}
                                            {property.is_for_sale && property.sale_price && (
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold',
                                                        auditImportRed ? 'text-red-600' : 'text-orange-600'
                                                    )}
                                                >
                                                    {property.sale_price.toLocaleString()} ฿
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    'text-[10px]',
                                                    auditImportRed ? 'text-red-600' : 'text-slate-400'
                                                )}
                                            >
                                                {property.profile?.full_name || property.profile?.email || '未割当'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Actions - Desktop */}
                                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={
                                                    selectedUsers[property.id] !== undefined
                                                        ? selectedUsers[property.id]
                                                        : agentIdSet.has(property.user_id || '')
                                                          ? (property.user_id || '')
                                                          : ''
                                                }
                                                onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-navy-primary max-w-[120px]"
                                            >
                                                <option value="">エージェントを選択...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                                disabled={
                                                    selectedUsers[property.id] === undefined ||
                                                    selectedUsers[property.id] === (property.user_id || '') ||
                                                    selectedUsers[property.id] === ''
                                                }
                                                className="px-2 py-1.5 bg-slate-100 text-navy-primary text-[10px] font-bold rounded-lg hover:bg-navy-primary hover:text-white transition-all disabled:opacity-30"
                                            >変更</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={currentStatus}
                                                onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none border bg-white max-w-[100px]"
                                            >
                                                <option value="draft">下書き</option>
                                                <option value="pending">承認待ち</option>
                                                <option value="published">公開中</option>
                                            </select>
                                            <button
                                                onClick={() => handleStatusChange(property.id, currentStatus)}
                                                disabled={selectedStatuses[property.id] === undefined || selectedStatuses[property.id] === property.status}
                                                className="px-2 py-1.5 bg-navy-primary text-white text-[10px] font-bold rounded-lg hover:bg-navy-secondary transition-all disabled:opacity-30"
                                            >変更</button>
                                        </div>
                                        <Link href={`/properties/${property.id}`} target="_blank" className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all" title="詳細">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => handleAction(property.id, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="削除">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Actions - Mobile */}
                                <div className="md:hidden mt-3 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <select
                                            value={
                                                selectedUsers[property.id] !== undefined
                                                    ? selectedUsers[property.id]
                                                    : agentIdSet.has(property.user_id || '')
                                                      ? (property.user_id || '')
                                                      : ''
                                            }
                                            onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="">エージェントを選択...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                            disabled={
                                                selectedUsers[property.id] === undefined ||
                                                selectedUsers[property.id] === (property.user_id || '') ||
                                                selectedUsers[property.id] === ''
                                            }
                                            className="px-3 py-2 bg-navy-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-30"
                                        >変更</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [property.id]: e.target.value }))}
                                            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="draft">下書き</option>
                                            <option value="pending">承認待ち</option>
                                            <option value="published">公開中</option>
                                        </select>
                                        <button
                                            onClick={() => handleStatusChange(property.id, currentStatus)}
                                            disabled={selectedStatuses[property.id] === undefined || selectedStatuses[property.id] === property.status}
                                            className="px-3 py-2 bg-navy-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-30"
                                        >変更</button>
                                        <Link href={`/properties/${property.id}`} target="_blank" className="p-2 rounded-lg bg-slate-50 text-slate-500">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => handleAction(property.id, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {mutationBusy ? (
                        <div
                            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]"
                            aria-live="polite"
                            aria-busy
                        >
                            <Loader2 className="h-10 w-10 animate-spin text-navy-primary" aria-hidden />
                        </div>
                    ) : null}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!listFetchBusy && totalCount !== null && totalCount > 0 && totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span className="text-xs font-bold text-slate-400">
                        全 {totalCount} 件中 {fromRow} - {toRow} 件を表示
                    </span>
                    <div className="flex space-x-1">
                        <button
                            type="button"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                            if (
                                i === 0 ||
                                i === totalPages - 1 ||
                                Math.abs(i + 1 - page) <= 1
                            ) {
                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${page === i + 1
                                            ? 'bg-navy-primary text-white border border-navy-primary'
                                            : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            } else if (
                                Math.abs(i + 1 - page) === 2
                            ) {
                                return <span key={i} className="px-1 py-1.5 text-slate-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            type="button"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
