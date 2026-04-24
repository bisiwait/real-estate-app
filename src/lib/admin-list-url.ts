/** 管理者ダッシュボード一覧の URL クエリ `page` / `limit` 用定数・パーサ */

export const ADMIN_LIST_LIMIT_OPTIONS = [20, 50, 100, 200] as const
export type AdminListLimit = (typeof ADMIN_LIST_LIMIT_OPTIONS)[number]

export const DEFAULT_ADMIN_LIST_LIMIT: AdminListLimit = 20

export function parseAdminListLimit(value: string | null | undefined): AdminListLimit {
    const n = Number(value)
    if (ADMIN_LIST_LIMIT_OPTIONS.includes(n as AdminListLimit)) return n as AdminListLimit
    return DEFAULT_ADMIN_LIST_LIMIT
}

export function parseAdminListPage(value: string | null | undefined): number {
    const n = parseInt(value || '1', 10)
    return Number.isFinite(n) && n >= 1 ? n : 1
}

/** PostgREST / Supabase の ilike 用に % と _ をエスケープ */
export function escapeIlikePattern(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export function maxPageForCount(totalCount: number, limit: number): number {
    if (totalCount <= 0) return 1
    return Math.max(1, Math.ceil(totalCount / limit))
}
