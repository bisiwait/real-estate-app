'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import MobileSearchBar from '@/components/property/MobileSearchBar'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, X, ChevronRight, Loader2, MapPin, Bath, Dog } from 'lucide-react'
import PriceRangeSlider from '@/components/ui/PriceRangeSlider'


const CITIES = [
    { label: 'パタヤ', value: 'Pattaya' },
    { label: 'シラチャ', value: 'Sriracha' }
]

const AREAS_BY_CITY: Record<string, { label: string, value: string }[]> = {
    Pattaya: [
        { label: 'ナクルア・ウォンアマット', value: 'North Pattaya / Wongamat' },
        { label: 'セントラルパタヤ', value: 'Central Pattaya' },
        { label: 'サウスパタヤ', value: 'South Pattaya' },
        { label: 'プラタムナック', value: 'Pratumnak' },
        { label: 'ジョムティエン', value: 'Jomtien' },
        { label: 'イーストパタヤ', value: 'East Pattaya' }
    ],
    Sriracha: [
        { label: 'ロビンソン周辺', value: 'ロビンソン周辺' },
        { label: 'スカパープ公園周辺', value: 'スカパープ公園周辺' },
        { label: 'アサンプション周辺', value: 'アサンプション周辺' },
        { label: 'J-Park周辺', value: 'J-Park周辺' },
        { label: 'スラサック・山側', value: 'スラサック・山側' }
    ]
}

const PRICE_RANGES = { min: 0, max: 80000, step: 5000 }
const SALE_PRICE_RANGES = { min: 0, max: 30000000, step: 1000000 }

const COMMON_TAGS = ['バスタブあり', '洗濯機室内', '日本語対応スタッフ', 'ペット可', '高層階（オーシャンビュー期待）']
const SRIRACHA_TAGS = [
    '法人契約可（Corporate Contract）',
    '企業送迎バスルート内（Company Shuttle）',
    '日本語テレビ無料（Japanese TV）',
    'イオン・ロビンソン徒歩圏（Near Shopping）',
    'ウォシュレット完備'
]

function PropertiesList() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
    const [dbProperties, setDbProperties] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [totalCount, setTotalCount] = useState<number>(0)
    const PAGE_SIZE = 9

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

    useEffect(() => {
        setLocalSearchQuery(searchQuery)
    }, [searchQuery])

    const fetchProperties = async (isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true)
        else {
            setLoading(true)
            setPage(0)
        }

        try {
            const currentPage = isLoadMore ? page + 1 : 0
            const from = currentPage * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            let query = supabase
                .from('properties')
                .select(`
                    *,
                    area:areas!inner (
                        name,
                        region:regions!inner (
                            name
                        )
                    )
                `, { count: 'exact' })
                .in('status', ['published', 'under_negotiation', 'contracted'])
                .eq('is_approved', true)

            // apply filters to query
            if (selectedCity) {
                query = query.eq('area.region.name', selectedCity)
            }
            if (selectedArea) {
                query = query.eq('area.name', selectedArea)
            }
            if (selectedPropertyType) {
                query = query.eq('property_type', selectedPropertyType)
            }

            // bathtub and pets filters
            if (bathtubFilter) query = query.eq('has_bathtub', true)
            if (petsFilter) query = query.eq('allows_pets', true)

            // type filters
            if (listingType === 'rent') {
                query = query.eq('is_for_rent', true).eq('is_presale', false)
            } else if (listingType === 'sell') {
                query = query.eq('is_for_sale', true).eq('is_presale', false)
            } else if (listingType === 'presale') {
                query = query.eq('is_presale', true)
            }

            // Price filter... (omitted for brevity, keeping existing)
            if (selectedPrice) {
                const [min, max] = selectedPrice.split('-').map(Number)
                const isMaxLimitRent = max >= 80000;
                const isMaxLimitSale = max >= 30000000;

                if (listingType !== 'all') {
                    const priceCol = listingType === 'rent' ? 'rent_price' : 'sale_price'
                    query = query.gte(priceCol, min)
                    const isMaxLimit = listingType === 'rent' ? isMaxLimitRent : isMaxLimitSale
                    if (!isMaxLimit) {
                        query = query.lte(priceCol, max)
                    }
                }
            }

            // Tags match (logical AND on server)
            if (selectedTags.length > 0) {
                query = query.contains('tags', selectedTags)
            }

            // Search query...
            if (searchQuery) {
                query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
            }

            // Order and Range...
            query = query
                .order('status', { ascending: true })
                .order('created_at', { ascending: false })
                .range(from, to)

            const { data, error, count } = await query

            console.log(`Fetch Results:`, {
                isLoadMore,
                currentPage,
                from,
                to,
                dataCount: data?.length,
                totalCount: count,
                selectedCity,
                selectedArea
            })

            if (error) {
                console.error('Supabase Error:', error)
            }

            if (count !== null) setTotalCount(count)

            if (data) {
                const formatted = data.map(p => ({
                    ...p,
                    city_name: p.area?.region?.name || 'Pattaya',
                    area_name: p.area?.name || 'Unknown'
                }))

                if (isLoadMore) {
                    setDbProperties(prev => {
                        const newProps = [...prev, ...formatted]
                        console.log(`Appending properties. New total: ${newProps.length}`)
                        return newProps
                    })
                    setPage(currentPage)
                } else {
                    setDbProperties(formatted)
                }

                const hasMoreData = count ? (from + formatted.length) < count : formatted.length === PAGE_SIZE
                console.log(`hasMore set to: ${hasMoreData}`)
                setHasMore(hasMoreData)
            }
        } catch (err) {
            console.error('Fetch Error:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const tagsRaw = searchParams.get('tags') || ''

    useEffect(() => {
        fetchProperties()
    }, [selectedCity, selectedArea, selectedPropertyType, selectedPrice, tagsRaw, searchQuery, listingType, bathtubFilter, petsFilter])

    // Use database properties directly as they are now filtered server-side
    const filteredProperties = dbProperties

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

    const toggleTag = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag]
        updateFilters({ tags: newTags })
    }

    const filterContentNode = (
        <div className="space-y-8">
            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <Search className="w-3 h-3 mr-2" />
                    キーワード検索
                </h3>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="物件名、設備など..."
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                        value={localSearchQuery}
                        onChange={(e) => {
                            setLocalSearchQuery(e.target.value)
                            updateFilters({ q: e.target.value })
                        }}
                    />
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4 flex items-center">
                    <MapPin className="w-3 h-3 mr-2" />
                    都市 (City)
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
                    エリア (Area)
                </h3>
                <div className="space-y-1">
                    <button
                        onClick={() => updateFilters({ area: null })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${!selectedArea ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>すべてのエリア</span>
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
                    物件タイプ (Property Type)
                </h3>
                <div className="space-y-1">
                    <button
                        onClick={() => updateFilters({ property_type: null })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${!selectedPropertyType ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>すべてのタイプ</span>
                        {!selectedPropertyType && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => updateFilters({ property_type: 'Condo' })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedPropertyType === 'Condo' ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>コンドミニアム</span>
                        {selectedPropertyType === 'Condo' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => updateFilters({ property_type: 'House' })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${selectedPropertyType === 'House' ? 'bg-navy-primary text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>一軒家ヴィラ</span>
                        {selectedPropertyType === 'House' && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {listingType !== 'all' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest leading-none">価格帯 (Budget)</h3>
                    </div>
                    <div className="px-2">
                        <PriceRangeSlider
                            key={listingType} // Re-mount when switching types to reset correctly if needed
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
                                if (val >= 1000000) return `${val / 10000}万 ฿`;
                                return `${val.toLocaleString()} ฿`;
                            }}
                        />
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4">こだわり設備 (Japanese Spec)</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => updateFilters({ bathtub: bathtubFilter ? null : 'true' })}
                        className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-xl text-xs font-bold transition-all border ${bathtubFilter ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-600 hover:border-navy-primary'}`}
                    >
                        <Bath className="w-3.5 h-3.5" />
                        <span>バスタブあり</span>
                    </button>
                    <button
                        onClick={() => updateFilters({ pets: petsFilter ? null : 'true' })}
                        className={`flex items-center justify-center space-x-2 px-3 py-3 rounded-xl text-xs font-bold transition-all border ${petsFilter ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-600 hover:border-navy-primary'}`}
                    >
                        <Dog className="w-3.5 h-3.5" />
                        <span>ペット可</span>
                    </button>
                </div>
            </div>

            {
                (selectedArea || selectedPropertyType || selectedPrice || selectedTags.length > 0 || searchQuery || bathtubFilter || petsFilter) && (
                    <button
                        onClick={() => {
                            updateFilters({ area: null, property_type: null, price: null, tags: null, q: null, bathtub: null, pets: null })
                        }}

                        className="w-full py-3 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors border border-dashed border-slate-200 rounded-xl"
                    >
                        条件をすべてクリア
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
                            <h1 className="text-4xl font-black mb-2 tracking-tight">物件を探す</h1>
                            <p className="text-slate-400 text-sm font-medium tracking-wide">PATTAYA LUXURY LISTINGS</p>
                        </div>
                        <div className="text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            全 {totalCount} 件中 {filteredProperties.length} 件を表示
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
                                    すべて
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'rent', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'rent' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    賃貸
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'sell', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'sell' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary hover:bg-slate-50'}`}
                                >
                                    売買
                                </button>
                                <button
                                    onClick={() => updateFilters({ type: 'presale', price: null })}
                                    className={`flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${listingType === 'presale' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'}`}
                                >
                                    プレセール
                                </button>
                            </div>

                            {/* Mobile search bar (Integrated) */}
                            <div className="lg:hidden w-full">
                                <MobileSearchBar
                                    searchQuery={searchQuery}
                                    onSearchChange={(val: string) => updateFilters({ q: val })}
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
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredProperties.map(property => (
                                        <PropertyCard key={property.id} property={property} />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => fetchProperties(true)}
                                            disabled={loadingMore}
                                            className="group flex flex-col items-center space-y-4"
                                        >
                                            <div className="px-12 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-navy-secondary shadow-lg hover:shadow-navy-primary/5 hover:border-navy-primary/30 hover:-translate-y-1 transition-all flex items-center space-x-3">
                                                {loadingMore ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-navy-primary" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-navy-primary group-hover:rotate-90 transition-transform" />
                                                )}
                                                <span>{loadingMore ? '読み込み中...' : 'もっと見る'}</span>
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
                                <h3 className="text-xl font-bold text-navy-secondary mb-2">該当する物件が見つかりませんでした</h3>
                                <p className="text-slate-500 mb-8">別の条件でお試しいただくか、条件をリセットしてください。</p>
                                <button
                                    onClick={() => updateFilters({ region: null, property_type: null, price: null, tags: null, q: null })}
                                    className="bg-navy-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-secondary transition-all"
                                >
                                    条件をリセットする
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
                            <h2 className="text-xl font-black text-navy-secondary">検索フィルター</h2>
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
                                {filteredProperties.length} 件の結果を表示
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function PropertiesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-navy-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <PropertiesList />
        </Suspense>
    )
}
