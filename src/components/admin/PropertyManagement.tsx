'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { escapeIlikePattern, maxPageForCount } from '@/lib/admin-list-url'
import {
    ADMIN_PROP_AREA,
    ADMIN_PROP_DEVELOPER_ID,
    ADMIN_PROP_LIST_FILTER,
    ADMIN_PROP_MAX_PRICE,
    ADMIN_PROP_MIN_PRICE,
    ADMIN_PROP_PROPERTY_TYPE,
    ADMIN_PROP_SEARCH,
    parseAdminPropListFilter,
    parseOptionalPositiveNumber,
    parseOptionalUuid,
} from '@/lib/admin-property-list-url'
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
} from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import PropertyThumbnail from '@/components/property/PropertyThumbnail'
import { cn } from '@/lib/utils'


type AreaRow = { id: string; name: string; slug: string }

const PROPERTY_TYPE_VALUES = ['Condo', 'House', 'Townhouse', 'Commercial'] as const

/** 存在しない area slug 指定時に全件ヒットさせないためのダミー UUID */
const NO_MATCH_AREA_ID = '00000000-0000-4000-8000-000000000001'

export default function AdminPropertyManagement() {
    const searchParams = useSearchParams()
    const [properties, setProperties] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState<number | null>(null)
    const [areas, setAreas] = useState<AreaRow[]>([])
    const [developers, setDevelopers] = useState<{ id: string; name: string }[]>([])
    const [filterPanelOpen, setFilterPanelOpen] = useState(true)
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
        }, 300)
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

    const areaIdForQuery = useMemo(() => {
        if (!areaSlug) return null
        const row = areas.find((a) => a.slug === areaSlug)
        return row?.id ?? null
    }, [areaSlug, areas])

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

    const fetchAreasAndDevelopers = useCallback(async () => {
        const [{ data: areaRows, error: areaErr }, { data: devRows, error: devErr }] = await Promise.all([
            supabase.from('areas').select('id, name, slug').order('name'),
            supabase.from('developers').select('id, name').order('name'),
        ])
        if (!areaErr && areaRows) setAreas(areaRows as AreaRow[])
        if (!devErr && devRows) setDevelopers(devRows as { id: string; name: string }[])
    }, [supabase])

    const fetchPropertiesPage = useCallback(async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            let q = supabase
                .from('properties')
                .select(
                    '*, profile:profiles!properties_user_id_fkey(id, full_name, email)',
                    { count: 'exact', head: false }
                )
                .order('created_at', { ascending: false })

            if (filter === 'pending') {
                q = q.or('is_approved.eq.false,is_approved.is.null,status.eq.pending')
            } else if (filter === 'active') {
                q = q.eq('is_approved', true).eq('status', 'published')
            } else if (filter === 'draft') {
                q = q.eq('status', 'draft')
            }

            if (areaSlug) {
                if (areaIdForQuery) {
                    q = q.eq('area_id', areaIdForQuery)
                } else if (areas.length > 0) {
                    q = q.eq('area_id', NO_MATCH_AREA_ID)
                }
            }

            if (propertyTypeParam && PROPERTY_TYPE_VALUES.includes(propertyTypeParam as (typeof PROPERTY_TYPE_VALUES)[number])) {
                q = q.eq('property_type', propertyTypeParam)
            }

            if (developerIdParam) {
                q = q.eq('developer_id', developerIdParam)
            }

            let minN = minPriceUrl
            let maxN = maxPriceUrl
            if (minN != null && maxN != null && minN > maxN) {
                const t = minN
                minN = maxN
                maxN = t
            }
            if (minN != null) q = q.gte('list_sort_price', minN)
            if (maxN != null) q = q.lte('list_sort_price', maxN)

            const trimmed = urlSearch.replace(/,/g, '')
            if (trimmed) {
                const pattern = `%${escapeIlikePattern(trimmed)}%`
                const textOr = [
                    `title.ilike.${pattern}`,
                    `description.ilike.${pattern}`,
                    `description_en.ilike.${pattern}`,
                    `description_th.ilike.${pattern}`,
                ].join(',')
                const { data: profMatches } = await supabase
                    .from('profiles')
                    .select('id')
                    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
                const ids = (profMatches ?? []).map((r) => r.id).filter(Boolean)
                if (ids.length > 0) {
                    q = q.or(`${textOr},user_id.in.(${ids.join(',')})`)
                } else {
                    q = q.or(textOr)
                }
            }

            const from = (page - 1) * limit
            const to = from + limit - 1
            const { data: rows, error, count } = await q.range(from, to)

            if (error) {
                console.error('Fetch properties error:', error)
                setErrorMessage(getErrorMessage(error))
                setProperties([])
                setTotalCount(0)
                return
            }

            const list = rows ?? []
            const normalized = list.map((property: any) => {
                const embedded = property.profile
                const profile = Array.isArray(embedded) ? embedded[0] : embedded
                const { profile: _p, ...rest } = property
                return { ...rest, profile }
            })
            setProperties(normalized)
            setTotalCount(typeof count === 'number' ? count : normalized.length)
        } finally {
            setLoading(false)
        }
    }, [
        supabase,
        filter,
        urlSearch,
        page,
        limit,
        areaSlug,
        areaIdForQuery,
        propertyTypeParam,
        developerIdParam,
        minPriceUrl,
        maxPriceUrl,
        areas.length,
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
        if (totalCount === null) return
        const maxP = maxPageForCount(totalCount, limit)
        if (page > maxP) setPage(maxP)
    }, [totalCount, limit, page, setPage])

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'restore') => {
        if (action === 'delete') {
            if (!confirm('削除しますか？この処理をすると戻せません。')) return
        }

        setLoading(true)
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
        } catch (err: any) {
            console.error('Admin action error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {

            setLoading(false)
        }
    }

    const handleAssignUser = async (id: string, newUserId: string) => {
        if (!confirm('掲載エージェントを変更しますか？')) return

        setLoading(true)
        try {
            const { error } = await supabase.from('properties').update({ user_id: newUserId || null }).eq('id', id)
            if (error) throw error
            await fetchPropertiesPage()
            setSelectedUsers(prev => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Assign user error:', err)
            setErrorMessage(getErrorMessage(err))
            setLoading(false)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setLoading(true)
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
            setSelectedStatuses((prev: Record<string, string>) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Status change error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setLoading(false)
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
                            {!loading && totalCount !== null && (
                                <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
                                    {totalCount}件
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
                                    value={PROPERTY_TYPE_VALUES.includes(propertyTypeParam as (typeof PROPERTY_TYPE_VALUES)[number]) ? propertyTypeParam : ''}
                                    onChange={(e) => setPropertyTypeFilter(e.target.value)}
                                    className="text-xs font-bold"
                                >
                                    <option value="">すべて</option>
                                    {PROPERTY_TYPE_VALUES.map((v) => (
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
                {loading && properties.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mb-4" />
                        <p className="font-bold">読み込み中...</p>
                    </div>
                ) : !loading && totalCount === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Filter className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">表示する物件がありません</p>
                    </div>
                ) : (
                    properties.map((property) => {
                        const currentStatus = selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status
                        return (
                            <div key={property.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                                {/* Mobile & Desktop unified layout */}
                                <div className="flex gap-3 md:gap-4">
                                    {/* Image */}
                                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
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
                                        <p className="text-sm font-black text-navy-secondary truncate">{property.title}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {property.is_for_rent && property.rent_price && (
                                                <span className="text-[10px] font-bold text-indigo-600">{property.rent_price.toLocaleString()} ฿/月</span>
                                            )}
                                            {property.is_for_sale && property.sale_price && (
                                                <span className="text-[10px] font-bold text-orange-600">{property.sale_price.toLocaleString()} ฿</span>
                                            )}
                                            <span className="text-[10px] text-slate-400">{property.profile?.full_name || property.profile?.email || '未割当'}</span>
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
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalCount !== null && totalCount > 0 && totalPages > 1 && (
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
