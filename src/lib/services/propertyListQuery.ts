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
    sort: PropertyListSort
}

function firstParam(v: string | string[] | undefined): string {
    if (v === undefined) return ''
    return Array.isArray(v) ? (v[0] ?? '') : v
}

/** Next.js App Router searchParams → 一覧クエリ用フィルタ */
export function parsePropertyListFiltersFromSearchParams(
    sp: Record<string, string | string[] | undefined>
): PropertyListFilters {
    const tagsRaw = firstParam(sp.tags)
    return {
        selectedCity: firstParam(sp.region) || 'Pattaya',
        selectedArea: firstParam(sp.area),
        selectedPropertyType: firstParam(sp.property_type),
        selectedPrice: firstParam(sp.price),
        selectedTags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
        listingType: firstParam(sp.type) || 'all',
        bathtubFilter: firstParam(sp.bathtub) === 'true',
        petsFilter: firstParam(sp.pets) === 'true',
        sort: parsePropertyListSort(firstParam(sp.sort)),
    }
}

/** URLSearchParams（クライアント）から同じ形のフィルタを生成 */
export function parsePropertyListFiltersFromURLSearchParams(searchParams: URLSearchParams): PropertyListFilters {
    const tagsRaw = searchParams.get('tags') || ''
    return {
        selectedCity: searchParams.get('region') || 'Pattaya',
        selectedArea: searchParams.get('area') || '',
        selectedPropertyType: searchParams.get('property_type') || '',
        selectedPrice: searchParams.get('price') || '',
        selectedTags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
        listingType: searchParams.get('type') || 'all',
        bathtubFilter: searchParams.get('bathtub') === 'true',
        petsFilter: searchParams.get('pets') === 'true',
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
        .in('status', ['published', 'under_negotiation', 'contracted'])
        .eq('is_approved', true)

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
