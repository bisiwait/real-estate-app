"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import MobileSearchBar from '@/components/property/MobileSearchBar'
import { createClient } from '@/lib/supabase/client'
import { useSearchCount } from '@/contexts/SearchCountContext'
import { Search, Filter, X, ChevronRight, Loader2, MapPin, Bath, Dog } from 'lucide-react'
import PriceRangeSlider from '@/components/ui/PriceRangeSlider'
import SaveSearchButton from '@/components/property/SaveSearchButton'
import {
    executePropertyListQuery,
    formatPropertyListRows,
    parsePropertyListFiltersFromURLSearchParams,
    PROPERTY_LIST_PAGE_SIZE,
} from '@/lib/services/propertyListQuery'

type PropertiesClientProps = {
    dict: any
    locale: string
    initialProperties?: any[]
    initialTotalCount?: number
    initialHasMore?: boolean
    /** サーバーでキャッシュ済みの初回データがあるとき、マウント直後の重複フェッチを避ける */
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

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
    const [dbProperties, setDbProperties] = useState<any[]>(initialProperties)
    const [loading, setLoading] = useState(!skipInitialClientFetch)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(initialHasMore)
    const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
    const savedScrollYRef = useRef<number | null>(null)
    const skipDuplicateFetchRef = useRef(skipInitialClientFetch)

    // Local constants derived from dict
    const CITIES = [
        { label: dict.property.cities.pattaya, value: 'Pattaya' },
        { label: dict.property.cities.sriracha, value: 'Sriracha' }
    ]

    const AREAS_BY_CITY: Record<string, { label: string, value: string }[]> = {
        Pattaya: [
            { label: dict.property.areas.pattaya_north, value: 'North Pattaya / Wongamat' },
            { label: dict.property.areas.pattaya_central, value: 'Central Pattaya' },
            { label: dict.property.areas.pattaya_south, value: 'South Pattaya' },
            { label: dict.property.areas.pattaya_pratumnak, value: 'Pratumnak' },
            { label: dict.property.areas.pattaya_jomtien, value: 'Jomtien' },
            { label: dict.property.areas.pattaya_east, value: 'East Pattaya' }
        ],
        Sriracha: [
            { label: dict.property.areas.sriracha_robinson, value: 'ロビンソン周辺' }, // Value should match DB
            { label: dict.property.areas.sriracha_park, value: 'スカパープ公園周辺' },
            { label: dict.property.areas.sriracha_assumption, value: 'アサンプション周辺' },
            { label: dict.property.areas.sriracha_jpark, value: 'J-Park周辺' },
            { label: dict.property.areas.sriracha_mt, value: 'スラサック・山側' }
        ]
    }

    const PRICE_RANGES = { min: 0, max: 80000, step: 5000 }
    const SALE_PRICE_RANGES = { min: 0, max: 30000000, step: 1000000 }

    // Local state derived from URL
    const selectedCity = searchParams.get('region') || 'Pattaya'
    const selectedArea = searchParams.get('area') || ''
    const selectedPrice = searchParams.get('price') || ''
    const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const searchQuery = searchParams.get('q') || ''
    const listingType = searchParams.get('type') || 'all'
    const bathtubFilter = searchParams.get('bathtub') === 'true'
    const petsFilter = searchParams.get('pets') === 'true'
    const selectedPropertyType = searchParams.get('property_type') || ''

    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
    const searchParamsRef = useRef(searchParams)
    const pathnameRef = useRef(pathname)
    const localSearchQueryRef = useRef(localSearchQuery)
    /** フォーカス中は URL→入力の同期をしない（replace 後の searchQuery で巻き戻るのを防ぐ） */
    const keywordFieldFocusedRef = useRef(false)
    const keywordBlurScheduleRef = useRef(0)
    searchParamsRef.current = searchParams
    pathnameRef.current = pathname
    localSearchQueryRef.current = localSearchQuery

    const handleKeywordFocus = () => {
        window.clearTimeout(keywordBlurScheduleRef.current)
        keywordFieldFocusedRef.current = true
    }

    const handleKeywordBlur = () => {
        keywordBlurScheduleRef.current = window.setTimeout(() => {
            keywordFieldFocusedRef.current = false
        }, 150)
    }

    useEffect(() => {
        return () => window.clearTimeout(keywordBlurScheduleRef.current)
    }, [])

    /** ブラウザ戻る・フィルタ操作・共有URLなど（入力中以外）で URL の q が変わったら反映 */
    useEffect(() => {
        if (keywordFieldFocusedRef.current) return
        setLocalSearchQuery(searchQuery)
    }, [searchQuery])

    /**
     * キーワードはローカルで即時表示し、入力が止まってから URL を replace。
     * q は trim せずそのまま保存し、同期 effect との食い違いで文字が消えるのを防ぐ。
     */
    useEffect(() => {
        const id = window.setTimeout(() => {
            const raw = localSearchQueryRef.current
            const params = new URLSearchParams(searchParamsRef.current.toString())
            const cur = params.get('q') ?? ''
            const nextEmpty = raw.trim() === ''
            const curEmpty = cur.trim() === ''
            if (nextEmpty && curEmpty) return
            if (!nextEmpty && raw === cur) return
            if (nextEmpty) params.delete('q')
            else params.set('q', raw)
            router.replace(`${pathnameRef.current}?${params.toString()}`, { scroll: false })
        }, 450)
        return () => window.clearTimeout(id)
    }, [localSearchQuery, router])

    const fetchProperties = async (isLoadMore = false) => {
        if (isLoadMore) {
            savedScrollYRef.current = window.scrollY
            setLoadingMore(true)
        }
        else {
            setLoading(true)
            setPage(0)
        }

        try {
            const currentPage = isLoadMore ? page + 1 : 0
            const from = currentPage * PROPERTY_LIST_PAGE_SIZE

            const filters = parsePropertyListFiltersFromURLSearchParams(
                new URLSearchParams(searchParams.toString())
            )

            const { data, error, count } = await executePropertyListQuery(supabase, filters, currentPage)

            if (error) {
                console.error('Supabase Error Details:', error)
            }

            if (count !== null) setTotalCount(count)

            if (data) {
                const formatted = formatPropertyListRows(data)

                if (isLoadMore) {
                    setDbProperties(prev => [...prev, ...formatted])
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

                const hasMoreData = count ? (from + formatted.length) < count : formatted.length === PROPERTY_LIST_PAGE_SIZE
                setHasMore(hasMoreData)
            }
        } catch (err: any) {
            console.error('Fetch Runtime Error:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const tagsRaw = searchParams.get('tags') || ''

    useEffect(() => {
        if (skipDuplicateFetchRef.current) {
            skipDuplicateFetchRef.current = false
            return
        }
        fetchProperties()
    }, [selectedCity, selectedArea, selectedPropertyType, selectedPrice, tagsRaw, searchQuery, listingType, bathtubFilter, petsFilter])

    // Use database properties directly as they are now filtered server-side
    const filteredProperties = dbProperties

    // Mobile drawer should show total results (not just the first page size)
    const drawerResultsCount = totalCount > 0 ? totalCount : filteredProperties.length

    // Share hit count to header (only meaningful on properties page)
    useEffect(() => {
        setPropertiesHitCount(totalCount > 0 ? totalCount : null)
        return () => setPropertiesHitCount(null)
    }, [totalCount, setPropertiesHitCount])

    // Sync filters to URL
    const updateFilters = (updates: Record<string, string | string[] | null>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                params.delete(key)
            } else if (Array.isArray(value)) {
                params.set(key, value.join(','))
            } else {
                params.set(key, value)
            }
        })

        // If city changes, clear area and tags
        if (updates.region !== undefined) {
            params.delete('area')
            params.delete('tags')
        }

        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const filterContentNode = (
        <div className="space-y-8">
            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <Search className="w-3 h-3 mr-2" />
                    {dict.property.keyword_search}
                </h3>
                <div className="relative">
                    <input
                        type="text"
                        suppressHydrationWarning
                        placeholder={dict.property.keyword_placeholder}
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        onFocus={handleKeywordFocus}
                        onBlur={handleKeywordBlur}
                    />
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <MapPin className="w-3 h-3 mr-2" />
                    {dict.property.city}
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {CITIES.map(city => (
                        <button
                            key={city.value}
                            onClick={() => updateFilters({ region: city.value })}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedCity === city.value ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
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
                <div className="space-y-1">
                    <button
                        onClick={() => updateFilters({ area: null })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${!selectedArea ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{dict.property.all_areas}</span>
                        {!selectedArea && <ChevronRight className="w-4 h-4" />}
                    </button>
                    {(AREAS_BY_CITY[selectedCity] || []).map(area => (
                        <button
                            key={area.value}
                            onClick={() => updateFilters({ area: area.value })}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedArea === area.value ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span>{area.label}</span>
                            {selectedArea === area.value && <ChevronRight className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <Filter className="w-3 h-3 mr-2" />
                    {dict.property.property_type}
                </h3>
                <div className="space-y-1">
                    <button
                        onClick={() => updateFilters({ property_type: null })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${!selectedPropertyType ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{dict.property.all_types}</span>
                        {!selectedPropertyType && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => updateFilters({ property_type: 'Condo' })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedPropertyType === 'Condo' ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{dict.property.condo}</span>
                        {selectedPropertyType === 'Condo' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => updateFilters({ property_type: 'House' })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedPropertyType === 'House' ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{dict.property.house}</span>
                        {selectedPropertyType === 'House' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => updateFilters({ property_type: 'Townhouse' })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedPropertyType === 'Townhouse' ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{dict.property.townhouse}</span>
                        {selectedPropertyType === 'Townhouse' && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {listingType !== 'all' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest leading-none">{dict.property.budget}</h3>
                    </div>
                    <div className="px-2">
                        <PriceRangeSlider
                            key={listingType}
                            min={listingType === 'rent' ? PRICE_RANGES.min : SALE_PRICE_RANGES.min}
                            max={listingType === 'rent' ? PRICE_RANGES.max : SALE_PRICE_RANGES.max}
                            step={listingType === 'rent' ? PRICE_RANGES.step : SALE_PRICE_RANGES.step}
                            initialMin={selectedPrice ? Number(selectedPrice.split('-')[0]) : undefined}
                            initialMax={selectedPrice ? Number(selectedPrice.split('-')[1]) : undefined}
                            onChange={(min, max) => {
                                updateFilters({ price: `${min}-${max}` })
                            }}
                            formatValue={(val) => {
                                if (val === 0) return '0 ฿';
                                if (val >= 1000000) {
                                    return locale === 'jp' ? `${val / 10000}万 ฿` : `${val / 1000000}M ฿`;
                                }
                                return `${val.toLocaleString()} ฿`;
                            }}
                        />
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4">{dict.property.japanese_spec}</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => updateFilters({ bathtub: bathtubFilter ? null : 'true' })}
                        className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-xl text-xs font-bold transition-all border ${bathtubFilter ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-600 hover:border-navy-primary'}`}
                    >
                        <Bath className="w-3.5 h-3.5" />
                        <span>{dict.property.bathtub}</span>
                    </button>
                    <button
                        onClick={() => updateFilters({ pets: petsFilter ? null : 'true' })}
                        className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-xl text-xs font-bold transition-all border ${petsFilter ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-600 hover:border-navy-primary'}`}
                    >
                        <Dog className="w-3.5 h-3.5" />
                        <span>{dict.property.pets}</span>
                    </button>
                </div>
            </div>

            <div>
                <SaveSearchButton dict={dict} variant="outline" fullWidth />
            </div>

            {
                (selectedArea || selectedPropertyType || selectedPrice || selectedTags.length > 0 || searchQuery || bathtubFilter || petsFilter) && (
                    <button
                        onClick={() => {
                            updateFilters({ area: null, property_type: null, price: null, tags: null, q: null, bathtub: null, pets: null })
                        }}
                        className="w-full py-3 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors border border-dashed border-slate-200 rounded-xl"
                    >
                        {dict.property.clear_filters}
                    </button>
                )
            }
        </div >
    )

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Page Header */}
            <div className="bg-navy-secondary text-white pt-12 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-6 h-full w-full">
                        {[...Array(24)].map((_, i) => <div key={i} className="border border-white/20" />)}
                    </div>
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black mb-2 tracking-tight">{dict.property.search_title}</h1>
                            <p className="text-slate-400 text-sm font-medium tracking-wide">{dict.property.luxury_listings}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <SaveSearchButton dict={dict} />
                            <div className="text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center shrink-0">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {dict.property.found_count.replace('{total}', totalCount.toString()).replace('{count}', filteredProperties.length.toString())}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 -mt-10 pb-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar / Top area for Mobile */}
                    <div className="lg:col-span-4 mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Tabs */}
                            <div className="flex flex-wrap gap-1 sm:gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => updateFilters({ type: 'all', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'all' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.all}
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'rent', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'rent' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.rent}
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'sell', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'sell' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    {dict.labels.sell}
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'presale', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'presale' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'}`}
                                >
                                    {dict.labels.presale}
                                </button>
                            </div>

                            {/* Mobile search bar (Integrated) */}
                            <div className="lg:hidden w-full">
                                <MobileSearchBar
                                    dict={dict}
                                    searchQuery={localSearchQuery}
                                    onSearchChange={(val: string) => setLocalSearchQuery(val)}
                                    onSearchFocus={handleKeywordFocus}
                                    onSearchBlur={handleKeywordBlur}
                                    onFilterClick={() => setIsFilterDrawerOpen(true)}
                                    activeFiltersCount={[
                                        selectedArea,
                                        selectedPropertyType,
                                        selectedPrice,
                                        bathtubFilter,
                                        petsFilter,
                                        selectedTags.length > 0
                                    ].filter(Boolean).length}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PC Filters Sidebar */}
                    <aside className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-28 border border-white/50 backdrop-blur-sm">
                            {filterContentNode}
                        </div>
                    </aside>

                    {/* Results Grid */}
                    <div className="lg:col-span-3">
                        {loading && dbProperties.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-slate-200 h-80 rounded-3xl" />
                                ))}
                            </div>
                        ) : filteredProperties.length > 0 ? (
                            <div className="space-y-12 min-h-[800px] ![overflow-anchor:none]" style={{ overflowAnchor: 'none' }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredProperties.map((property, idx) => (
                                        <PropertyCard
                                            key={property.id}
                                            property={property}
                                            dict={dict}
                                            imagePriority={idx < 6}
                                        />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                fetchProperties(true);
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
                                    onClick={() => updateFilters({ region: null, property_type: null, price: null, tags: null, q: null })}
                                    className="bg-navy-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-secondary transition-all"
                                >
                                    {dict.property.reset_filters_btn}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer (Overlay) */}
            {isFilterDrawerOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div
                        className="absolute inset-0 bg-navy-secondary/60 backdrop-blur-sm"
                        onClick={() => setIsFilterDrawerOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-navy-secondary">{dict.property.search_drawer_title}</h2>
                            <button
                                onClick={() => setIsFilterDrawerOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {filterContentNode}

                        <div className="mt-12">
                            <button
                                onClick={() => setIsFilterDrawerOpen(false)}
                                className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-navy-secondary transition-all"
                            >
                                {dict.property.show_results.replace('{count}', drawerResultsCount.toString())}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
