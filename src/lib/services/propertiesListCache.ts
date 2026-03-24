import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
    executePropertyListQuery,
    formatPropertyListRows,
    parsePropertyListFiltersFromSearchParams,
    PROPERTY_LIST_PAGE_SIZE,
    type PropertyListFilters,
} from '@/lib/services/propertyListQuery'

/** unstable_cache のキーにフィルターを含める（キー固定だと全 URL が同じキャッシュを共有し空表示になる） */
function filtersToCacheKeyParts(f: PropertyListFilters): string[] {
    return [
        f.selectedCity,
        f.selectedArea,
        f.selectedPropertyType,
        f.selectedPrice,
        [...f.selectedTags].sort().join('\u001f'),
        f.listingType,
        f.bathtubFilter ? '1' : '0',
        f.petsFilter ? '1' : '0',
    ]
}

/**
 * 物件一覧の初回ページを 60 秒 ISR 相当でキャッシュ（フィルタ組み合わせごと）
 */
export async function getCachedPropertiesListFirstPage(
    searchParams: Record<string, string | string[] | undefined>
) {
    const filters = parsePropertyListFiltersFromSearchParams(searchParams)
    const keyParts = ['properties-list-first-page', ...filtersToCacheKeyParts(filters)]

    const run = unstable_cache(
        async () => {
            const supabase = createStaticClient()
            const { data, error, count } = await executePropertyListQuery(supabase, filters, 0)
            if (error) {
                console.error('[getCachedPropertiesListFirstPage]', error)
                return { formatted: [] as any[], count: 0, pageSize: PROPERTY_LIST_PAGE_SIZE }
            }
            const formatted = formatPropertyListRows(data)
            return {
                formatted,
                count: count ?? 0,
                pageSize: PROPERTY_LIST_PAGE_SIZE,
            }
        },
        keyParts,
        { revalidate: 60 }
    )

    return run()
}
