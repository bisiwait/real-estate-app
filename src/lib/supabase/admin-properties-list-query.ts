/**
 * 管理者ダッシュボード「物件一覧」のサーバーサイド用 Supabase クエリ。
 * 全件取得やクライアント側の .filter() は行わず、PostgREST の条件 + range のみでページを返す。
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { escapeIlikePattern } from '@/lib/admin-list-url'
import type { AdminPropListFilter } from '@/lib/admin-property-list-url'

export const ADMIN_PROPERTY_TYPE_VALUES = ['Condo', 'House', 'Townhouse', 'Commercial'] as const
const PROPERTY_TYPE_SET = new Set<string>(ADMIN_PROPERTY_TYPE_VALUES)

/** エージェント名検索で properties.user_id.in(...) に載せる ID の上限（URL・クエリ肥大化防止） */
export const ADMIN_PROPERTY_PROFILE_SEARCH_ID_LIMIT = 120

/** 存在しない area slug 指定時に 0 件にするためのダミー UUID */
export const ADMIN_PROPERTY_NO_MATCH_AREA_ID = '00000000-0000-4000-8000-000000000001'

export type AdminPropertyAreaFilter =
    | { kind: 'none' }
    | { kind: 'eq'; areaId: string }
    | { kind: 'no_match' }
    | { kind: 'wait_areas' }

export function resolveAdminPropertyAreaFilter(
    areaSlug: string,
    areas: { id: string; slug: string }[]
): AdminPropertyAreaFilter {
    const slug = areaSlug.trim()
    if (!slug) return { kind: 'none' }
    if (areas.length === 0) return { kind: 'wait_areas' }
    const row = areas.find((a) => a.slug === slug)
    if (row) return { kind: 'eq', areaId: row.id }
    return { kind: 'no_match' }
}

export type AdminPropertiesListFetchParams = {
    listFilter: AdminPropListFilter
    urlSearch: string
    area: AdminPropertyAreaFilter
    propertyTypeParam: string
    developerIdParam: string | null
    minPriceUrl: number | null
    maxPriceUrl: number | null
    page: number
    limit: number
}

export type AdminPropertyRowWithProfile = Record<string, unknown> & {
    id: string
    profile?: unknown
}

/**
 * 物件一覧の 1 ページを取得。count: 'exact' は同一レスポンスに含める。
 */
export async function fetchAdminPropertiesPage(
    supabase: SupabaseClient,
    params: AdminPropertiesListFetchParams
): Promise<{
    rows: AdminPropertyRowWithProfile[]
    count: number | null
    error: Error | null
}> {
    const {
        listFilter,
        urlSearch,
        area,
        propertyTypeParam,
        developerIdParam,
        minPriceUrl,
        maxPriceUrl,
        page,
        limit,
    } = params

    if (area.kind === 'wait_areas') {
        return { rows: [], count: null, error: null }
    }

    let q = supabase
        .from('properties')
        .select('*, profile:profiles!properties_user_id_fkey(id, full_name, email)', {
            count: 'exact',
            head: false,
        })
        .order('created_at', { ascending: false })

    if (listFilter === 'pending') {
        q = q.or('is_approved.eq.false,is_approved.is.null,status.eq.pending')
    } else if (listFilter === 'active') {
        q = q.eq('is_approved', true).eq('status', 'published')
    } else if (listFilter === 'draft') {
        q = q.eq('status', 'draft')
    }

    if (area.kind === 'eq') {
        q = q.eq('area_id', area.areaId)
    } else if (area.kind === 'no_match') {
        q = q.eq('area_id', ADMIN_PROPERTY_NO_MATCH_AREA_ID)
    }

    if (propertyTypeParam && PROPERTY_TYPE_SET.has(propertyTypeParam)) {
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

    const trimmed = urlSearch.replace(/,/g, '').trim()
    if (trimmed) {
        const pattern = `%${escapeIlikePattern(trimmed)}%`
        const textOr = [
            `title.ilike.${pattern}`,
            `description.ilike.${pattern}`,
            `description_en.ilike.${pattern}`,
            `description_th.ilike.${pattern}`,
        ].join(',')

        const { data: profMatches, error: profErr } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
            .eq('user_role', 'agent')
            .is('deleted_at', null)
            .limit(ADMIN_PROPERTY_PROFILE_SEARCH_ID_LIMIT)

        if (profErr) {
            return {
                rows: [],
                count: 0,
                error: profErr instanceof Error ? profErr : new Error(String(profErr.message ?? profErr)),
            }
        }

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
        return {
            rows: [],
            count: 0,
            error: error instanceof Error ? error : new Error(String(error.message ?? error)),
        }
    }

    const list = (rows ?? []) as AdminPropertyRowWithProfile[]
    const normalized = list.map((property) => {
        const embedded = property.profile
        const profile = Array.isArray(embedded) ? embedded[0] : embedded
        const { profile: _p, ...rest } = property
        return { ...rest, profile } as AdminPropertyRowWithProfile
    })

    return {
        rows: normalized,
        count: typeof count === 'number' ? count : normalized.length,
        error: null,
    }
}
