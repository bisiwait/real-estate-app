'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import PropertyCard from '@/components/property/PropertyCard'
import MobileSearchBar from '@/components/property/MobileSearchBar'
import { createClient } from '@/lib/supabase/client'
import { Search, Filter, X, ChevronRight, SlidersHorizontal, Loader2, MapPin, Bath, Dog } from 'lucide-react'


const CITIES = [
    { label: 'パタヤ', value: 'Pattaya' },
    { label: 'シラチャ', value: 'Sriracha' }
]

const AREAS_BY_CITY: Record<string, { label: string, value: string }[]> = {
    Pattaya: [
        { label: 'ジョムティエン', value: 'Jomtien' },
        { label: 'セントラルパタヤ', value: 'Central Pattaya' },
        { label: 'プラトゥムナック', value: 'Pratumnak' },
        { label: 'ナクルア', value: 'Naklua' },
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

const PRICE_RANGES = [
    { label: '1.5万B以下', value: '0-15000' },
    { label: '1.5万〜3万B', value: '15000-30000' },
    { label: '3万〜5万B', value: '30000-50000' },
    { label: '5万B以上', value: '50000-999999' }
]

const SALE_PRICE_RANGES = [
    { label: '300万B以下', value: '0-3000000' },
    { label: '300万〜600万B', value: '3000000-6000000' },
    { label: '600万〜1000万B', value: '6000000-10000000' },
    { label: '1000万B以上', value: '10000000-999999999' }
]

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

    // Local state derived from URL
    const selectedCity = searchParams.get('region') || 'Pattaya'
    const selectedArea = searchParams.get('area') || ''
    const selectedPrice = searchParams.get('price') || ''
    const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const searchQuery = searchParams.get('q') || ''
    const listingType = searchParams.get('type') || 'rent'
    const bathtubFilter = searchParams.get('bathtub') === 'true'
    const petsFilter = searchParams.get('pets') === 'true'


    useEffect(() => {
        async function fetchProperties() {
            setLoading(true)
            try {
                // Query properties table directly with joins to avoid view cache issues
                const { data, error } = await supabase
                    .from('properties')
                    .select('*, area:areas(name, region:regions(name))')
                    .eq('status', 'published')
                    .eq('is_approved', true)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Supabase Error:', error)
                }

                if (data) {
                    // Map nested area.name to flat area_name for the PropertyCard
                    const formatted = data.map(p => ({
                        ...p,
                        city_name: p.area?.region?.name || 'Pattaya',
                        area_name: p.area?.name || 'Unknown'
                    }))
                    setDbProperties(formatted)
                }
            } catch (err) {
                console.error('Fetch Error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchProperties()
    }, [])


    // Merge with Mock Data for demonstration if DB is empty
    const allProperties = useMemo(() => {
        const { MOCK_PROPERTIES } = require('@/lib/mock-data')

        // Add city_name to mock properties based on their area_name if not present
        const formattedMock = MOCK_PROPERTIES.map((p: any) => {
            let city = 'Pattaya';
            if (AREAS_BY_CITY.Sriracha.some(a => a.value === p.area_name)) {
                city = 'Sriracha';
            }
            return {
                ...p,
                city_name: city
            };
        });

        return [...dbProperties, ...formattedMock]
    }, [dbProperties])

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

    const filteredProperties = useMemo(() => {
        return allProperties.filter(property => {
            // City match
            const matchesCity = property.city_name === selectedCity

            // Area match
            const matchesArea = !selectedArea || property.area_name === selectedArea

            // Price match (Update to support separate rent/sale prices)
            let matchesPrice = true
            if (selectedPrice) {
                const [min, max] = selectedPrice.split('-').map(Number)
                const currentPrice = listingType === 'rent' ? property.rent_price : property.sale_price
                // Fallback to old price column if new ones are null (though migration should have handled this)
                const effectivePrice = currentPrice ?? property.price
                matchesPrice = effectivePrice >= min && effectivePrice <= max
            }

            // Tags match (logical AND)
            const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => property.tags?.includes(tag))

            // New Japanese-specific filters (Check both boolean column and tags for backward compatibility)
            const matchesBathtub = !bathtubFilter || property.has_bathtub || property.tags?.includes('バスタブあり')
            const matchesPets = !petsFilter || property.allows_pets || property.tags?.includes('ペット可')

            // Search match
            const matchesSearch = !searchQuery ||
                property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                property.description.toLowerCase().includes(searchQuery.toLowerCase())

            // Listing Type match (Update to support dual listing)
            const matchesType = listingType === 'rent' ? property.is_for_rent : property.is_for_sale

            return matchesCity && matchesArea && matchesPrice && matchesTags && matchesSearch && matchesBathtub && matchesPets && matchesType

        })
    }, [allProperties, selectedCity, selectedArea, selectedPrice, selectedTags, searchQuery])

    const toggleTag = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag]
        updateFilters({ tags: newTags })
    }

    const FilterContent = () => (
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
                        value={searchQuery}
                        onChange={(e) => updateFilters({ q: e.target.value })}
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
                <h3 className="text-xs font-bold text-navy-primary uppercase tracking-widest mb-4">価格帯 (Budget)</h3>
                <div className="grid grid-cols-1 gap-2">
                    {(listingType === 'rent' ? PRICE_RANGES : SALE_PRICE_RANGES).map(range => (
                        <button
                            key={range.value}
                            onClick={() => updateFilters({ price: selectedPrice === range.value ? null : range.value })}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${selectedPrice === range.value ? 'bg-navy-primary border-navy-primary text-white font-bold' : 'bg-white border-slate-100 text-slate-600 hover:border-navy-primary'}`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

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
                (selectedArea || selectedPrice || selectedTags.length > 0 || searchQuery || bathtubFilter || petsFilter) && (
                    <button
                        onClick={() => {
                            updateFilters({ area: null, price: null, tags: null, q: null, bathtub: null, pets: null })
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
                            {filteredProperties.length} 件の物件が見つかりました
                        </div>
                    </div>
                </div>
            </div>

            {/* Rent / Sell Tabs */}
            <div className="container mx-auto px-4 mt-8">
                <div className="flex bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl w-fit border border-slate-100 shadow-sm">
                    <button
                        onClick={() => updateFilters({ type: 'rent' })}
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${listingType === 'rent' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                    >
                        賃貸 (Rent)
                    </button>
                    <button
                        onClick={() => updateFilters({ type: 'sell' })}
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${listingType === 'sell' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                    >
                        売買 (Sell)
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 -mt-12 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* PC Filters Sidebar */}
                    <aside className="hidden lg:block">
                        <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-28 border border-white/50 backdrop-blur-sm">
                            <FilterContent />
                        </div>
                    </aside>

                    {/* Mobile Filter Trigger & Search */}
                    <div className="lg:hidden mb-12">
                        <MobileSearchBar
                            searchQuery={searchQuery}
                            onSearchChange={(val: string) => updateFilters({ q: val })}
                            onFilterClick={() => setIsFilterDrawerOpen(true)}
                            activeFiltersCount={[
                                selectedArea,
                                selectedPrice,
                                bathtubFilter,
                                petsFilter,
                                selectedTags.length > 0
                            ].filter(Boolean).length}
                        />
                    </div>

                    {/* Results Grid */}
                    <div className="lg:col-span-3">
                        {loading && dbProperties.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-slate-200 h-80 rounded-3xl" />
                                ))}
                            </div>
                        ) : filteredProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredProperties.map(property => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-lg p-20 text-center border border-slate-100">
                                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <X className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-navy-secondary mb-2">該当する物件が見つかりませんでした</h3>
                                <p className="text-slate-500 mb-8">別の条件でお試しいただくか、条件をリセットしてください。</p>
                                <button
                                    onClick={() => updateFilters({ region: null, price: null, tags: null, q: null })}
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

                        <FilterContent />

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
