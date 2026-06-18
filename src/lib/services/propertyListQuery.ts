import type { SupabaseClient } from '@supabase/supabase-js'

export const PROPERTY_LIST_PAGE_SIZE = 9

/** URL: 省略時は newest */
export type PropertyListSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc'

export function parsePropertyListSort(raw: string | null | undefined): PropertyListSort {
    if (raw === 'oldest' || raw === 'price_asc' || raw === 'price_desc') return raw
    return 'newest'
}

export type PropertyListFilters = {
    selectedCity: string
    selectedArea: string
    selectedPropertyType: string
    selectedPrice: string
    selectedTags: string[]
    listingType: string
    bathtubFilter: boolean
    petsFilter: boolean
    selectedBedrooms: BedroomFilterValue
    sort: PropertyListSort
}

/** URL `bedrooms` パラメータ（0=スタジオ, 4plus=4ベッド以上） */
export type BedroomFilterValue = '' | '0' | '1' | '2' | '3' | '4plus'

export function parseBedroomFilter(raw: string | null | undefined): BedroomFilterValue {
    const t = (raw ?? '').trim()
    if (t === '0' || t === '1' || t === '2' || t === '3' || t === '4plus') return t
    return ''
}

function firstParam(v: string | string[] | undefined): string {
    if (v === undefined) return ''
    return Array.isArray(v) ? (v[0] ?? '') : v
}

/** 旧エリア名のブックマーク URL を新しい DB 上の area.name に寄せる */
const LEGACY_AREA_FILTER_TO_CANONICAL: Record<string, string> = {
    ロビンソン周辺: 'シラチャ中心部',
    スカパープ公園周辺: 'シラチャ中心部',
    アサンプション周辺: 'イオン周辺',
    'J-Park周辺': 'Jパーク周辺',
    'スラサック・山側': 'その他',
}

export function normalizeLegacyAreaFilter(area: string): string {
    const t = area.trim()
    return LEGACY_AREA_FILTER_TO_CANONICAL[t] ?? t
}

/** Next.js App Router searchParams → 一覧クエリ用フィルタ */
export function parsePropertyListFiltersFromSearchParams(
    sp: Record<string, string | string[] | undefined>
): PropertyListFilters {
    const tagsRaw = firstParam(sp.tags)
    return {
        selectedCity: firstParam(sp.region) || 'Pattaya',
        selectedArea: normalizeLegacyAreaFilter(firstParam(sp.area)),
        selectedPropertyType: firstParam(sp.property_type),
        selectedPrice: firstParam(sp.price),
        selectedTags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
        listingType: firstParam(sp.type) || 'all',
        bathtubFilter: firstParam(sp.bathtub) === 'true',
        petsFilter: firstParam(sp.pets) === 'true',
        selectedBedrooms: parseBedroomFilter(firstParam(sp.bedrooms)),
        sort: parsePropertyListSort(firstParam(sp.sort)),
    }
}

/** URLSearchParams（クライアント）から同じ形のフィルタを生成 */
export function parsePropertyListFiltersFromURLSearchParams(searchParams: URLSearchParams): PropertyListFilters {
    const tagsRaw = searchParams.get('tags') || ''
    return {
        selectedCity: searchParams.get('region') || 'Pattaya',
        selectedArea: normalizeLegacyAreaFilter(searchParams.get('area') || ''),
        selectedPropertyType: searchParams.get('property_type') || '',
        selectedPrice: searchParams.get('price') || '',
        selectedTags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
        listingType: searchParams.get('type') || 'all',
        bathtubFilter: searchParams.get('bathtub') === 'true',
        petsFilter: searchParams.get('pets') === 'true',
        selectedBedrooms: parseBedroomFilter(searchParams.get('bedrooms')),
        sort: parsePropertyListSort(searchParams.get('sort')),
    }
}

/**
 * 物件一覧の Supabase クエリを構築（order / range の前まで）
 */
export function buildFilteredPropertiesQuery(supabase: SupabaseClient, filters: PropertyListFilters) {
    const {
        selectedCity,
        selectedArea,
        selectedPropertyType,
        selectedPrice,
        selectedTags,
        listingType,
        bathtubFilter,
        petsFilter,
        selectedBedrooms,
    } = filters

    let query = supabase
        .from('properties')
        .select(
            `
                    *,
                    area:areas!inner (
                        name,
                        region:regions!inner (
                            name
                        )
                    )
                `,
            { count: 'exact' }
        )
        .eq('status', 'published')
        .eq('is_approved', true)
        .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`)

    if (selectedCity) {
        query = query.eq('area.region.name', selectedCity)
    }
    if (selectedArea) {
        query = query.eq('area.name', selectedArea)
    }
    if (selectedPropertyType) {
        query = query.eq('property_type', selectedPropertyType)
    }

    if (bathtubFilter) query = query.eq('has_bathtub', true)
    if (petsFilter) query = query.eq('allows_pets', true)

    if (selectedBedrooms === '0') {
        query = query.eq('bedrooms', 0)
    } else if (selectedBedrooms === '1') {
        query = query.eq('bedrooms', 1)
    } else if (selectedBedrooms === '2') {
        query = query.eq('bedrooms', 2)
    } else if (selectedBedrooms === '3') {
        query = query.eq('bedrooms', 3)
    } else if (selectedBedrooms === '4plus') {
        query = query.gte('bedrooms', 4)
    }

    if (listingType === 'rent') {
        query = query.eq('is_for_rent', true).eq('is_presale', false)
    } else if (listingType === 'sell' || listingType === 'buy') {
        query = query.eq('is_for_sale', true).eq('is_presale', false)
    } else if (listingType === 'presale') {
        query = query.eq('is_presale', true)
    }

    if (selectedPrice) {
        const parts = selectedPrice.split('-').map(Number)
        const min = parts[0]
        const max = parts[1]
        if (Number.isFinite(min) && Number.isFinite(max)) {
            const isMaxLimitRent = max >= 80000
            const isMaxLimitSale = max >= 30000000

            if (listingType !== 'all') {
                const priceCol = listingType === 'rent' ? 'rent_price' : 'sale_price'
                query = query.gte(priceCol, min)
                const isMaxLimit = listingType === 'rent' ? isMaxLimitRent : isMaxLimitSale
                if (!isMaxLimit) {
                    query = query.lte(priceCol, max)
                }
            }
        }
    }

    if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags)
    }

    return query
}

/** 価格ソート可: 賃貸のみ・売買のみ（「すべて」等で月額と総額が混在すると比較不能のため） */
export function isPropertyListPriceSortAllowed(listingType: string): boolean {
    return listingType === 'rent' || listingType === 'sell' || listingType === 'buy'
}

function applyPropertyListSort<T extends { order: (...args: any[]) => T }>(query: T, filters: PropertyListFilters): T {
    const { sort, listingType } = filters

    if (sort === 'oldest') {
        return query.order('updated_at', { ascending: true }).order('id', { ascending: true })
    }

    const wantsPriceSort = sort === 'price_asc' || sort === 'price_desc'
    if (wantsPriceSort && !isPropertyListPriceSortAllowed(listingType)) {
        return query.order('updated_at', { ascending: false }).order('id', { ascending: false })
    }

    if (wantsPriceSort) {
        const ascending = sort === 'price_asc'
        const o = { ascending }
        if (listingType === 'rent') {
            return query.order('rent_price', o).order('updated_at', { ascending: false }).order('id', { ascending: false })
        }
        if (listingType === 'sell' || listingType === 'buy') {
            return query.order('sale_price', o).order('updated_at', { ascending: false }).order('id', { ascending: false })
        }
    }

    return query.order('updated_at', { ascending: false }).order('id', { ascending: false })
}

export async function executePropertyListQuery(
    supabase: SupabaseClient,
    filters: PropertyListFilters,
    page: number
) {
    const from = page * PROPERTY_LIST_PAGE_SIZE
    const to = from + PROPERTY_LIST_PAGE_SIZE - 1

    const base = buildFilteredPropertiesQuery(supabase, filters)
    const q = applyPropertyListSort(base, filters).range(from, to)

    return q
}

export function formatPropertyListRows(data: any[] | null) {
    if (!data) return []
    return data.map((p) => ({
        ...p,
        city_name: p.area?.region?.name || 'Pattaya',
        area_name: p.area?.name || 'Unknown',
    }))
}
