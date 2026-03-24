import type { SupabaseClient } from '@supabase/supabase-js'

export const PROPERTY_LIST_PAGE_SIZE = 9

export type PropertyListFilters = {
    selectedCity: string
    selectedArea: string
    selectedPropertyType: string
    selectedPrice: string
    selectedTags: string[]
    listingType: string
    bathtubFilter: boolean
    petsFilter: boolean
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
        const [min, max] = selectedPrice.split('-').map(Number)
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

    if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags)
    }

    return query
}

export async function executePropertyListQuery(
    supabase: SupabaseClient,
    filters: PropertyListFilters,
    page: number
) {
    const from = page * PROPERTY_LIST_PAGE_SIZE
    const to = from + PROPERTY_LIST_PAGE_SIZE - 1

    const q = buildFilteredPropertiesQuery(supabase, filters)
        .order('status', { ascending: true })
        .order('last_confirmed_at', { ascending: false })
        .range(from, to)

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
