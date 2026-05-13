"use client"

import { useState, useEffect, useLayoutEffect, useRef, useTransition, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import { createClient } from '@/lib/supabase/client'
import { useSearchCount } from '@/contexts/SearchCountContext'
import { ArrowDownWideNarrow, Filter, X, ChevronRight, Loader2, MapPin, Bath, Dog, SlidersHorizontal, Waves, Map } from 'lucide-react'
import PriceRangeSlider from '@/components/ui/PriceRangeSlider'
import SaveSearchButton from '@/components/property/SaveSearchButton'
import {
    executePropertyListQuery,
    formatPropertyListRows,
    isPropertyListPriceSortAllowed,
    parsePropertyListFiltersFromURLSearchParams,
    parsePropertyListSort,
    PROPERTY_LIST_PAGE_SIZE,
    type PropertyListSort,
} from '@/lib/services/propertyListQuery'
import { cn } from '@/lib/utils'
import AreaMapSelector from '@/components/search/AreaMapSelector'
import { Button } from '@/components/ui/button'

/** 一覧→詳細→戻る でリスト件数・スクロールを復元する */
const PROPERTY_LIST_RESTORE_STORAGE_KEY = 'propertyListBrowseRestore'

type PropertyListRestoreV1 = {
    v: 1
    pathname: string
    search: string
    scrollY: number
    properties: any[]
    page: number
    hasMore: boolean
    totalCount: number
}

/** DB の tags 配列と一致（messages の property.tags と同じキー） */
const OCEAN_VIEW_TAG = 'オーシャンビュー'

type FilterDraft = {
    region: string
    area: string
    property_type: string
    price: string
    tags: string[]
    type: string
    bathtub: boolean
    pets: boolean
}

/** トップヒーロー等は type=buy、一覧タブは sell で統一（大文字小文字も正規化） */
function normalizeListingTypeFromUrl(raw: string | null): string {
    const t = (raw || '').trim().toLowerCase()
    if (!t || t === 'all') return 'all'
    if (t === 'buy') return 'sell'
    if (t === 'rent' || t === 'sell' || t === 'presale') return t
    return (raw || '').trim()
}

function draftFromSearchParams(sp: URLSearchParams): FilterDraft {
    const tags = sp.get('tags')?.split(',').filter(Boolean) || []
    return {
        region: sp.get('region') || 'Pattaya',
        area: sp.get('area') || '',
        property_type: sp.get('property_type') || '',
        price: sp.get('price') || '',
        tags,
        type: normalizeListingTypeFromUrl(sp.get('type')),
        bathtub: sp.get('bathtub') === 'true',
        pets: sp.get('pets') === 'true',
    }
}

function serializeDraft(d: FilterDraft): string {
    return JSON.stringify({
        ...d,
        tags: [...d.tags].sort(),
    })
}

/** クエリはドラフトから組み立て（確定時のみ URL に反映）。sort は sortSource から引き継ぐ（null でリセット時は引き継がない） */
function buildSearchParamsFromDraft(d: FilterDraft, sortSource: URLSearchParams | null): URLSearchParams {
    const p = new URLSearchParams()
    p.set('region', d.region || 'Pattaya')
    if (d.area) p.set('area', d.area)
    if (d.property_type) p.set('property_type', d.property_type)
    if (d.price) p.set('price', d.price)
    if (d.tags.length > 0) p.set('tags', d.tags.join(','))
    if (d.type && d.type !== 'all') p.set('type', d.type)
    if (d.bathtub) p.set('bathtub', 'true')
    if (d.pets) p.set('pets', 'true')
    if (sortSource) {
        const s = sortSource.get('sort')
        if (s === 'oldest' || s === 'price_asc' || s === 'price_desc') {
            p.set('sort', s)
        }
    }
    return p
}

const EMPTY_DRAFT: FilterDraft = {
    region: 'Pattaya',
    area: '',
    property_type: '',
    price: '',
    tags: [],
    type: 'all',
    bathtub: false,
    pets: false,
}

type PropertiesClientProps = {
    dict: any
    locale: string
    initialProperties?: any[]
    initialTotalCount?: number
    initialHasMore?: boolean
    skipInitialClientFetch?: boolean
}

export default function PropertiesClient({
    dict,
    locale,
    initialProperties = [],
    initialTotalCount = 0,
    initialHasMore = true,
    skipInitialClientFetch = false,
}: PropertiesClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const { setPropertiesHitCount } = useSearchCount()

    const [draft, setDraft] = useState<FilterDraft>(() =>
        draftFromSearchParams(new URLSearchParams(searchParams.toString()))
    )

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
    const [areaMapOpen, setAreaMapOpen] = useState(false)
    const [dbProperties, setDbProperties] = useState<any[]>(initialProperties)
    const [loading, setLoading] = useState(!skipInitialClientFetch)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(initialHasMore)
    const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
    const savedScrollYRef = useRef<number | null>(null)
    const skipInitialClientFetchRef = useRef(
        skipInitialClientFetch ? (process.env.NODE_ENV === 'development' ? 2 : 1) : 0
    )
    const fetchGenRef = useRef(0)
    const [isFilterNavPending, startFilterNavTransition] = useTransition()
    /** sessionStorage 復元後は同一マウント内の初回クエリ fetch をスキップ */
    const skipListFetchAfterSessionRestoreRef = useRef(false)
    /** 復元したスクロール位置（スクロール適用後にクリア） */
    const pendingListScrollAfterRestoreRef = useRef<number | null>(null)
    /** マウント時のルート（戻る復元のキー照合用・初回レンダーのみ固定） */
    const listMountRouteRef = useRef<{ pathname: string; search: string } | null>(null)
    if (listMountRouteRef.current === null) {
        listMountRouteRef.current = { pathname, search: searchParams.toString() }
    }

    const searchParamsKey = searchParams.toString()

    const persistListStateBeforeDetail = useCallback(() => {
        try {
            const payload: PropertyListRestoreV1 = {
                v: 1,
                pathname,
                search: searchParamsKey,
                scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
                properties: dbProperties,
                page,
                hasMore,
                totalCount,
            }
            sessionStorage.setItem(PROPERTY_LIST_RESTORE_STORAGE_KEY, JSON.stringify(payload))
        } catch {
            /* 容量超過・シークレットモード等 */
        }
    }, [pathname, searchParamsKey, dbProperties, page, hasMore, totalCount])

    // ブラウザ戻る・共有 URL などでクエリが変わったらドラフトを同期
    useEffect(() => {
        setDraft(draftFromSearchParams(new URLSearchParams(searchParamsKey)))
        setAreaMapOpen(false)
    }, [searchParamsKey])

    const committedDraft = useMemo(
        () => draftFromSearchParams(new URLSearchParams(searchParamsKey)),
        [searchParamsKey]
    )
    const draftDirty = useMemo(
        () => serializeDraft(draft) !== serializeDraft(committedDraft),
        [draft, committedDraft]
    )

    const CITIES = [
        { label: dict.property.cities.pattaya, value: 'Pattaya' },
        { label: dict.property.cities.sriracha, value: 'Sriracha' },
    ]

    const AREAS_BY_CITY: Record<string, { label: string; value: string }[]> = {
        Pattaya: [
            { label: dict.property.areas.pattaya_north, value: 'North Pattaya / Wongamat' },
            { label: dict.property.areas.pattaya_central, value: 'Central Pattaya' },
            { label: dict.property.areas.pattaya_south, value: 'South Pattaya' },
            { label: dict.property.areas.pattaya_pratumnak, value: 'Pratumnak' },
            { label: dict.property.areas.pattaya_jomtien, value: 'Jomtien' },
            { label: dict.property.areas.pattaya_east, value: 'East Pattaya' },
        ],
        Sriracha: [
            { label: dict.property.areas.sriracha_robinson, value: 'ロビンソン周辺' },
            { label: dict.property.areas.sriracha_park, value: 'スカパープ公園周辺' },
            { label: dict.property.areas.sriracha_assumption, value: 'アサンプション周辺' },
            { label: dict.property.areas.sriracha_jpark, value: 'J-Park周辺' },
            { label: dict.property.areas.sriracha_mt, value: 'スラサック・山側' },
        ],
    }

    const PRICE_RANGES = { min: 0, max: 80000, step: 5000 }
    const SALE_PRICE_RANGES = { min: 0, max: 30000000, step: 1000000 }

    const selectedCity = searchParams.get('region') || 'Pattaya'
    const selectedArea = searchParams.get('area') || ''
    const selectedPrice = searchParams.get('price') || ''
    const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const listingType = searchParams.get('type') || 'all'
    const bathtubFilter = searchParams.get('bathtub') === 'true'
    const petsFilter = searchParams.get('pets') === 'true'
    const selectedPropertyType = searchParams.get('property_type') || ''
    const listSort = parsePropertyListSort(searchParams.get('sort'))
    const priceSortEnabled = isPropertyListPriceSortAllowed(listingType)
    const effectiveListSort: PropertyListSort = priceSortEnabled
        ? listSort
        : listSort === 'price_asc' || listSort === 'price_desc'
          ? 'newest'
          : listSort

    const draftOceanView = draft.tags.includes(OCEAN_VIEW_TAG)

    const pushDraftToUrl = useCallback(
        (d: FilterDraft) => {
            const next = buildSearchParamsFromDraft(d, searchParams).toString()
            if (next === searchParams.toString()) return
            setLoading(true)
            startFilterNavTransition(() => {
                router.replace(`${pathname}?${next}`, { scroll: false })
            })
        },
        [pathname, router, searchParams, startFilterNavTransition]
    )

    const applyFilters = useCallback(
        (opts?: { closeDrawer?: boolean }) => {
            const next = buildSearchParamsFromDraft(draft, searchParams).toString()
            if (next === searchParams.toString()) {
                if (opts?.closeDrawer) setIsFilterDrawerOpen(false)
                return
            }
            setLoading(true)
            startFilterNavTransition(() => {
                router.replace(`${pathname}?${next}`, { scroll: false })
            })
            if (opts?.closeDrawer) setIsFilterDrawerOpen(false)
        },
        [draft, pathname, router, searchParams, startFilterNavTransition]
    )

    const changeListSort = useCallback(
        (value: PropertyListSort) => {
            const p = new URLSearchParams(searchParams.toString())
            if (value === 'newest') {
                p.delete('sort')
            } else {
                p.set('sort', value)
            }
            const qs = p.toString()
            if (qs === searchParams.toString()) return
            const url = qs ? `${pathname}?${qs}` : pathname
            setLoading(true)
            startFilterNavTransition(() => {
                router.replace(url, { scroll: false })
            })
        },
        [pathname, router, searchParams, startFilterNavTransition]
    )

    /** 賃買種別タブは一覧を即反映（現在のドラフトを URL に載せて type / price を更新） */
    const applyListingTypeTab = useCallback(
        (type: FilterDraft['type']) => {
            const next = { ...draft, type, price: '' }
            setDraft(next)
            const qs = buildSearchParamsFromDraft(next, searchParams).toString()
            if (qs !== searchParams.toString()) {
                setLoading(true)
                startFilterNavTransition(() => {
                    router.replace(`${pathname}?${qs}`, { scroll: false })
                })
            }
        },
        [draft, pathname, router, searchParams, startFilterNavTransition]
    )

    /** エリアマップから選択 → ドラフト・URL を即時更新しマップを閉じる */
    const selectAreaFromMap = useCallback(
        (value: string) => {
            const next = { ...draft, area: value }
            setDraft(next)
            setAreaMapOpen(false)
            const qs = buildSearchParamsFromDraft(next, searchParams).toString()
            if (qs !== searchParams.toString()) {
                setLoading(true)
                startFilterNavTransition(() => {
                    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
                })
            }
        },
        [draft, pathname, router, searchParams, startFilterNavTransition]
    )

    const fetchProperties = async (isLoadMore = false) => {
        const myGen = ++fetchGenRef.current

        if (isLoadMore) {
            savedScrollYRef.current = window.scrollY
            setLoadingMore(true)
        } else {
            setLoading(true)
            setLoadingMore(false)
            setPage(0)
        }

        try {
            const currentPage = isLoadMore ? page + 1 : 0
            const from = currentPage * PROPERTY_LIST_PAGE_SIZE

            const filters = parsePropertyListFiltersFromURLSearchParams(
                new URLSearchParams(searchParams.toString())
            )

            const { data, error, count } = await executePropertyListQuery(supabase, filters, currentPage)

            if (myGen !== fetchGenRef.current) return

            if (error) {
                console.error('Supabase Error Details:', error)
            }

            if (count !== null) setTotalCount(count)

            if (data) {
                const formatted = formatPropertyListRows(data)

                if (isLoadMore) {
                    setDbProperties((prev) => [...prev, ...formatted])
                    setPage(currentPage)

                    setTimeout(() => {
                        if (savedScrollYRef.current !== null) {
                            window.scrollTo({ top: savedScrollYRef.current, behavior: 'instant' })
                            savedScrollYRef.current = null
                        }
                    }, 50)
                } else {
                    setDbProperties(formatted)
                }

                const hasMoreData = count
                    ? from + formatted.length < count
                    : formatted.length === PROPERTY_LIST_PAGE_SIZE
                setHasMore(hasMoreData)
            }
        } catch (err: any) {
            if (myGen !== fetchGenRef.current) return
            console.error('Fetch Runtime Error:', err)
        } finally {
            if (myGen === fetchGenRef.current) {
                setLoading(false)
                setLoadingMore(false)
            }
        }
    }

    const tagsRaw = searchParams.get('tags') || ''

    /** 「すべて」表示中に価格ソートが URL に残っていると一覧と UI がずれるため除去 */
    useEffect(() => {
        if (priceSortEnabled) return
        const sp = new URLSearchParams(searchParamsKey)
        const s = sp.get('sort')
        if (s !== 'price_asc' && s !== 'price_desc') return
        sp.delete('sort')
        const qs = sp.toString()
        setLoading(true)
        startFilterNavTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        })
    }, [listingType, pathname, priceSortEnabled, router, searchParamsKey, startFilterNavTransition])

    /**
     * ブラウザ「戻る」で戻ったとき: sessionStorage を最優先でリストに反映し、初回 fetch で上書きしない。
     */
    useEffect(() => {
        const route = listMountRouteRef.current
        if (!route) return
        try {
            const raw = sessionStorage.getItem(PROPERTY_LIST_RESTORE_STORAGE_KEY)
            if (!raw) return
            const data = JSON.parse(raw) as PropertyListRestoreV1
            if (data.v !== 1 || !Array.isArray(data.properties)) return
            if (data.pathname !== route.pathname || data.search !== route.search) return
            setDbProperties(data.properties)
            setPage(typeof data.page === 'number' ? data.page : 0)
            setHasMore(Boolean(data.hasMore))
            setTotalCount(
                typeof data.totalCount === 'number' ? data.totalCount : data.properties.length
            )
            setLoading(false)
            setLoadingMore(false)
            pendingListScrollAfterRestoreRef.current = Math.max(0, Number(data.scrollY) || 0)
            skipListFetchAfterSessionRestoreRef.current = true
        } catch {
            /* ignore */
        }
    }, [])

    /**
     * 復元したリストがコミットされたあとでスクロールし、完了したら sessionStorage を削除。
     * useLayoutEffect でレイアウト確定後に実行（画像などで高さが変わる場合のずれを軽減）。
     */
    useLayoutEffect(() => {
        if (pendingListScrollAfterRestoreRef.current === null) return
        const y = pendingListScrollAfterRestoreRef.current
        pendingListScrollAfterRestoreRef.current = null
        let innerRaf = 0
        const outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior })
                try {
                    sessionStorage.removeItem(PROPERTY_LIST_RESTORE_STORAGE_KEY)
                } catch {
                    /* ignore */
                }
            })
        })
        return () => {
            cancelAnimationFrame(outerRaf)
            cancelAnimationFrame(innerRaf)
        }
    }, [dbProperties])

    useEffect(() => {
        if (skipListFetchAfterSessionRestoreRef.current) {
            skipListFetchAfterSessionRestoreRef.current = false
            while (skipInitialClientFetchRef.current > 0) {
                skipInitialClientFetchRef.current -= 1
            }
            return
        }
        if (skipInitialClientFetchRef.current > 0) {
            skipInitialClientFetchRef.current -= 1
            return
        }
        fetchProperties()
    }, [selectedCity, selectedArea, selectedPropertyType, selectedPrice, tagsRaw, listingType, bathtubFilter, petsFilter, listSort])

    const filteredProperties = dbProperties

    const drawerResultsCount = totalCount > 0 ? totalCount : filteredProperties.length

    useEffect(() => {
        setPropertiesHitCount(totalCount > 0 ? totalCount : null)
        return () => setPropertiesHitCount(null)
    }, [totalCount, setPropertiesHitCount])

    const activeFilterChipCount = [
        draft.area,
        draft.property_type,
        draft.price,
        draft.bathtub,
        draft.pets,
        draft.tags.length > 0,
    ].filter(Boolean).length

    const handleClearDraftFilters = () => {
        setDraft({ ...EMPTY_DRAFT })
        pushDraftToUrl(EMPTY_DRAFT)
    }

    const toggleDraftOceanTag = () => {
        setDraft((prev) => {
            const has = prev.tags.includes(OCEAN_VIEW_TAG)
            const tags = has ? prev.tags.filter((t) => t !== OCEAN_VIEW_TAG) : [...prev.tags, OCEAN_VIEW_TAG]
            return { ...prev, tags }
        })
    }

    const selectFieldClass =
        'w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-navy-secondary appearance-none cursor-pointer focus:ring-2 focus:ring-navy-primary focus:border-transparent outline-none'

    const resultsBusy = loading || isFilterNavPending

    const preferenceLabelClass = (active: boolean, activeRing: string) =>
        cn(
            'flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 transition-all',
            active ? activeRing : 'border-slate-200 bg-white hover:border-navy-primary/25'
        )

    /** 検索パネル内で横幅いっぱいに使う（サイドバー／ドロワー共通） */
    const renderPreferencesBlock = () => (
        <div className="w-full min-w-0 rounded-2xl border-2 border-navy-primary/15 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm">
            <h3 className="text-sm font-black text-navy-secondary mb-1 tracking-tight">
                {dict.property.preferences_title}
            </h3>
            <p className="mb-3 text-[11px] font-bold text-slate-400 leading-relaxed">
                {dict.property.preferences_hint}
            </p>
            <div className="space-y-2.5">
                <label
                    className={cn(
                        preferenceLabelClass(draft.pets, 'border-amber-400 bg-amber-50/80 shadow-inner'),
                        'min-w-0 gap-3 px-4 py-3.5 sm:px-5 sm:py-4'
                    )}
                >
                    <input
                        type="checkbox"
                        checked={draft.pets}
                        onChange={() => setDraft((d) => ({ ...d, pets: !d.pets }))}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 text-navy-primary focus:ring-navy-primary"
                    />
                    <Dog className="h-6 w-6 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1 text-left text-sm font-black leading-snug text-navy-secondary">
                        {dict.property.pets}
                    </span>
                </label>
                <label
                    className={cn(
                        preferenceLabelClass(draft.bathtub, 'border-sky-400 bg-sky-50/80 shadow-inner'),
                        'min-w-0 gap-3 px-4 py-3.5 sm:px-5 sm:py-4'
                    )}
                >
                    <input
                        type="checkbox"
                        checked={draft.bathtub}
                        onChange={() => setDraft((d) => ({ ...d, bathtub: !d.bathtub }))}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 text-navy-primary focus:ring-navy-primary"
                    />
                    <Bath className="h-6 w-6 shrink-0 text-sky-600" />
                    <span className="min-w-0 flex-1 text-left text-sm font-black leading-snug text-navy-secondary">
                        {dict.property.bathtub}
                    </span>
                </label>
                <label
                    className={cn(
                        preferenceLabelClass(draftOceanView, 'border-cyan-500 bg-cyan-50/80 shadow-inner'),
                        'min-w-0 gap-3 px-4 py-3.5 sm:px-5 sm:py-4'
                    )}
                >
                    <input
                        type="checkbox"
                        checked={draftOceanView}
                        onChange={toggleDraftOceanTag}
                        className="h-5 w-5 shrink-0 rounded border-slate-300 text-navy-primary focus:ring-navy-primary"
                    />
                    <Waves className="h-6 w-6 shrink-0 text-cyan-600" />
                    <span className="min-w-0 flex-1 text-left text-sm font-black leading-snug text-navy-secondary">
                        {dict.property.ocean_view_filter}
                    </span>
                </label>
            </div>
        </div>
    )

    const renderFilterPanel = (opts?: { showApplyButton?: boolean }) => (
        <div className="min-w-0 max-w-full space-y-8">
            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <MapPin className="w-3 h-3 mr-2" />
                    {dict.property.city}
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {CITIES.map((city) => (
                        <button
                            key={city.value}
                            type="button"
                            onClick={() => {
                                setDraft((d) => ({
                                    ...d,
                                    region: city.value,
                                    area: '',
                                    tags: [],
                                }))
                                setAreaMapOpen(false)
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${draft.region === city.value ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                        >
                            {city.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <Filter className="w-3 h-3 mr-2" />
                    {dict.property.area}
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                    <select
                        id="filter-area-select"
                        aria-label={dict.property.area}
                        className={cn(selectFieldClass, 'min-h-[44px] flex-1 min-w-0')}
                        value={draft.area}
                        onChange={(e) => {
                            setDraft((d) => ({ ...d, area: e.target.value }))
                            setAreaMapOpen(false)
                        }}
                    >
                        <option value="">{dict.property.all_areas}</option>
                        {(AREAS_BY_CITY[draft.region] || []).map((area) => (
                            <option key={area.value} value={area.value}>
                                {area.label}
                            </option>
                        ))}
                    </select>
                    {draft.region === 'Pattaya' ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-expanded={areaMapOpen}
                            aria-controls="pattaya-area-map-panel"
                            onClick={() => setAreaMapOpen((o) => !o)}
                            className="h-[44px] shrink-0 gap-2 border-slate-200 px-3 font-semibold text-slate-700 hover:bg-slate-50 sm:min-w-[9.5rem]"
                        >
                            <Map className="h-4 w-4 shrink-0 text-navy-primary" aria-hidden />
                            <span className="truncate">{dict.property.area_map_from_map_option}</span>
                        </Button>
                    ) : null}
                </div>
                {draft.region === 'Pattaya' && areaMapOpen ? (
                    <div id="pattaya-area-map-panel" className="mt-3">
                        <AreaMapSelector
                            open
                            areas={AREAS_BY_CITY.Pattaya}
                            region={draft.region}
                            selectedUrlArea={searchParams.get('area') || ''}
                            onPickArea={selectAreaFromMap}
                            dict={{
                                area_map_title: dict.property.area_map_title,
                                area_map_hint: dict.property.area_map_hint,
                            }}
                        />
                    </div>
                ) : null}
            </div>

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <Filter className="w-3 h-3 mr-2" />
                    {dict.property.property_type}
                </h3>
                <select
                    id="filter-property-type-select"
                    aria-label={dict.property.property_type}
                    className={selectFieldClass}
                    value={draft.property_type}
                    onChange={(e) => setDraft((d) => ({ ...d, property_type: e.target.value }))}
                >
                    <option value="">{dict.property.all_types}</option>
                    <option value="Condo">{dict.property.condo}</option>
                    <option value="House">{dict.property.house}</option>
                    <option value="Townhouse">{dict.property.townhouse}</option>
                    <option value="Commercial">{dict.property.shop}</option>
                </select>
            </div>

            {draft.type !== 'all' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest leading-none">
                            {dict.property.budget}
                        </h3>
                    </div>
                    <div className="min-w-0 max-w-full px-0 sm:px-2">
                        <PriceRangeSlider
                            key={draft.type}
                            min={draft.type === 'rent' ? PRICE_RANGES.min : SALE_PRICE_RANGES.min}
                            max={draft.type === 'rent' ? PRICE_RANGES.max : SALE_PRICE_RANGES.max}
                            step={draft.type === 'rent' ? PRICE_RANGES.step : SALE_PRICE_RANGES.step}
                            debounceMs={180}
                            initialMin={draft.price ? Number(draft.price.split('-')[0]) : undefined}
                            initialMax={draft.price ? Number(draft.price.split('-')[1]) : undefined}
                            onChange={(min, max) => {
                                setDraft((d) => ({ ...d, price: `${min}-${max}` }))
                            }}
                            formatValue={(val) => {
                                if (val === 0) return '0 ฿'
                                if (val >= 1000000) {
                                    return locale === 'jp' ? `${val / 10000}万 ฿` : `${val / 1000000}M ฿`
                                }
                                return `${val.toLocaleString()} ฿`
                            }}
                        />
                    </div>
                </div>
            )}

            {renderPreferencesBlock()}

            {opts?.showApplyButton ? (
                <button
                    type="button"
                    disabled={resultsBusy}
                    onClick={() => applyFilters()}
                    className="w-full py-4 rounded-2xl bg-navy-primary text-white text-sm font-black shadow-lg shadow-navy-primary/20 hover:bg-navy-secondary transition-all active:scale-[0.99] disabled:opacity-80 disabled:pointer-events-none flex items-center justify-center gap-2 min-h-[52px]"
                >
                    {resultsBusy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden /> : null}
                    <span>{dict.property.apply_filters_btn}</span>
                </button>
            ) : null}

            {(draft.area ||
                draft.property_type ||
                draft.price ||
                draft.tags.length > 0 ||
                draft.bathtub ||
                draft.pets) && (
                <button
                    type="button"
                    onClick={handleClearDraftFilters}
                    className="w-full py-3 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors border border-dashed border-slate-200 rounded-xl"
                >
                    {dict.property.clear_filters}
                </button>
            )}
        </div>
    )

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="bg-navy-secondary text-white pt-12 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-6 h-full w-full">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="border border-white/20" />
                        ))}
                    </div>
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black mb-2 tracking-tight !text-white">{dict.property.search_title}</h1>
                            <p className="text-sm font-medium tracking-wide !text-white">{dict.property.luxury_listings}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <SaveSearchButton dict={dict} />
                            <div className="text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center shrink-0">
                                {resultsBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {dict.property.found_count
                                    .replace('{total}', totalCount.toString())
                                    .replace('{count}', filteredProperties.length.toString())}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 pb-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-4 mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                            <div className="flex flex-wrap gap-1 sm:gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl w-full min-w-0 sm:w-fit border border-slate-200 shadow-sm overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => applyListingTypeTab('all')}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${draft.type === 'all' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.all}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyListingTypeTab('rent')}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${draft.type === 'rent' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.rent}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyListingTypeTab('sell')}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${draft.type === 'sell' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.sell}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyListingTypeTab('presale')}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${draft.type === 'presale' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'}`}
                                >
                                    {dict.labels.presale}
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 w-full lg:w-auto lg:shrink-0 lg:ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsFilterDrawerOpen(true)}
                                    className="flex lg:hidden w-full sm:w-auto sm:min-w-0 items-center justify-center gap-3 rounded-2xl border-2 border-navy-primary/15 bg-white px-5 py-4 min-h-[48px] text-sm font-black text-navy-secondary shadow-md shadow-navy-primary/5 transition-all active:scale-[0.99] hover:border-navy-primary/30"
                                >
                                    <SlidersHorizontal className="h-5 w-5 text-navy-primary shrink-0" />
                                    <span>{dict.property.open_filters_mobile}</span>
                                    {activeFilterChipCount > 0 ? (
                                        <span className="min-w-[1.5rem] rounded-full bg-navy-primary px-2 py-0.5 text-center text-[11px] font-black text-white">
                                            {activeFilterChipCount}
                                        </span>
                                    ) : null}
                                </button>

                                <div className="flex items-center gap-2.5 w-full sm:w-auto sm:min-w-[min(100%,280px)] lg:min-w-[240px] justify-end sm:justify-start">
                                    <span
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-primary shadow-md shadow-navy-primary/25"
                                        aria-hidden
                                    >
                                        <ArrowDownWideNarrow className="h-5 w-5 text-white" />
                                    </span>
                                    <select
                                        value={effectiveListSort}
                                        onChange={(e) => changeListSort(e.target.value as PropertyListSort)}
                                        className={`${selectFieldClass} min-h-[48px] flex-1 sm:flex-1 sm:min-w-[200px] bg-white border-slate-200 shadow-sm`}
                                        aria-label={dict.property.sort_label}
                                        title={dict.property.sort_label}
                                    >
                                        <option value="newest">{dict.property.sort_newest}</option>
                                        <option value="oldest">{dict.property.sort_oldest}</option>
                                        <option value="price_asc" disabled={!priceSortEnabled}>
                                            {dict.property.sort_price_asc}
                                        </option>
                                        <option value="price_desc" disabled={!priceSortEnabled}>
                                            {dict.property.sort_price_desc}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="hidden lg:block lg:col-span-1 min-w-0">
                        <div className="bg-white rounded-3xl shadow-xl px-5 py-7 sm:px-6 sm:py-8 sticky top-28 border border-white/50 backdrop-blur-sm">
                            {renderFilterPanel({ showApplyButton: true })}
                        </div>
                    </aside>

                    <div className="lg:col-span-3">
                        {loading && dbProperties.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-slate-200 h-80 rounded-3xl" />
                                ))}
                            </div>
                        ) : filteredProperties.length > 0 ? (
                            <div
                                className={`relative space-y-12 min-h-[800px] ![overflow-anchor:none] transition-opacity duration-150 ${loading && !loadingMore ? 'opacity-60' : 'opacity-100'}`}
                                style={{ overflowAnchor: 'none' }}
                                aria-busy={loading && !loadingMore}
                            >
                                {loading && !loadingMore ? (
                                    <div
                                        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 shadow-lg border border-slate-100 flex items-center gap-2"
                                        aria-hidden
                                    >
                                        <Loader2 className="h-4 w-4 animate-spin text-navy-primary" />
                                        <span className="text-xs font-black text-navy-secondary">{dict.property.refreshing_results}</span>
                                    </div>
                                ) : null}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredProperties.map((property, idx) => (
                                        <PropertyCard
                                            key={property.id}
                                            property={property}
                                            dict={dict}
                                            imagePriority={idx < 6}
                                            onBeforeNavigateToDetail={persistListStateBeforeDetail}
                                        />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                fetchProperties(true)
                                            }}
                                            disabled={loadingMore}
                                            className="group flex flex-col items-center space-y-4"
                                        >
                                            <div className="px-12 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-navy-secondary shadow-lg hover:shadow-navy-primary/5 hover:border-navy-primary/30 hover:-translate-y-1 transition-all flex items-center space-x-3">
                                                {loadingMore ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-navy-primary" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-navy-primary group-hover:rotate-90 transition-transform" />
                                                )}
                                                <span>{loadingMore ? dict.property.loading_more : dict.property.load_more_listings}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Load More Listings</p>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-lg p-20 text-center border border-slate-100">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <X className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-navy-secondary mb-2">{dict.property.no_results_title}</h3>
                                <p className="text-slate-500 mb-8">{dict.property.no_results_desc}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraft({ ...EMPTY_DRAFT })
                                        setLoading(true)
                                        startFilterNavTransition(() => {
                                            router.replace(
                                                `${pathname}?${buildSearchParamsFromDraft(EMPTY_DRAFT, null).toString()}`,
                                                { scroll: false }
                                            )
                                        })
                                    }}
                                    className="bg-navy-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-secondary transition-all"
                                >
                                    {dict.property.reset_filters_btn}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isFilterDrawerOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden overflow-x-hidden">
                    <div className="absolute inset-0 bg-navy-secondary/60 backdrop-blur-sm" onClick={() => setIsFilterDrawerOpen(false)} />
                    <div className="absolute right-2 top-2 bottom-2 flex w-[min(24rem,calc(100vw-1rem))] flex-col rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in slide-in-from-right duration-300 min-w-0 box-border">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                            <h2 className="min-w-0 text-lg font-black leading-tight text-navy-secondary sm:text-xl">
                                {dict.property.search_drawer_title}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsFilterDrawerOpen(false)}
                                className="shrink-0 p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4 pt-2 sm:px-5">
                            {renderFilterPanel()}
                        </div>

                        <div className="shrink-0 space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5">
                            <button
                                type="button"
                                onClick={() => applyFilters({ closeDrawer: true })}
                                disabled={!draftDirty || resultsBusy}
                                className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-navy-secondary transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 min-h-[52px]"
                            >
                                {resultsBusy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden /> : null}
                                <span>{dict.property.apply_filters_btn}</span>
                            </button>
                            <p className="text-center text-[10px] font-bold text-slate-400 leading-relaxed px-1">
                                {dict.property.apply_filters_footer_hint}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
