import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
    executePropertyListQuery,
    formatPropertyListRows,
    parsePropertyListFiltersFromSearchParams,
    PROPERTY_LIST_PAGE_SIZE,
    type PropertyListFilters,
} from '@/lib/services/propertyListQuery'

const fetchFirstPageCached = unstable_cache(
    async (f: PropertyListFilters) => {
        const supabase = createStaticClient()
        const { data, error, count } = await executePropertyListQuery(supabase, f, 0)
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
    ['properties-list-first-page'],
    { revalidate: 60 }
)

/**
 * 物件一覧の初回ページを 60 秒 ISR 相当でキャッシュ（フィルタ組み合わせごと）
 */
export async function getCachedPropertiesListFirstPage(
    searchParams: Record<string, string | string[] | undefined>
) {
    const filters = parsePropertyListFiltersFromSearchParams(searchParams)
    return fetchFirstPageCached(filters)
}
