/** 管理者「物件承認・管理」一覧の URL クエリ用 */

/** フリーワードを URL に反映するまでの待ち（ms）。この間は Supabase 一覧クエリを走らせない。 */
export const ADMIN_PROP_SEARCH_DEBOUNCE_MS = 400

export const ADMIN_PROP_SEARCH = 'search'
export const ADMIN_PROP_AREA = 'area'
export const ADMIN_PROP_MIN_PRICE = 'minPrice'
export const ADMIN_PROP_MAX_PRICE = 'maxPrice'
export const ADMIN_PROP_PROPERTY_TYPE = 'property_type'
export const ADMIN_PROP_DEVELOPER_ID = 'developer_id'
/** 一覧タブ: all | pending | active | draft */
export const ADMIN_PROP_LIST_FILTER = 'prop_filter'

export type AdminPropListFilter = 'all' | 'pending' | 'active' | 'draft'

const FILTER_SET = new Set<AdminPropListFilter>(['all', 'pending', 'active', 'draft'])

export function parseAdminPropListFilter(value: string | null | undefined): AdminPropListFilter {
    const v = (value || '').trim().toLowerCase()
    if (FILTER_SET.has(v as AdminPropListFilter)) return v as AdminPropListFilter
    return 'all'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseOptionalUuid(value: string | null | undefined): string | null {
    const v = (value || '').trim()
    return UUID_RE.test(v) ? v : null
}

/** 正の数のみ。それ以外は null */
export function parseOptionalPositiveNumber(value: string | null | undefined): number | null {
    if (value === null || value === undefined) return null
    const s = String(value).trim().replace(/,/g, '')
    if (!s) return null
    const n = Number(s)
    if (!Number.isFinite(n) || n < 0) return null
    return n
}
