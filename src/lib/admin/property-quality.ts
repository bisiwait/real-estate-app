/** 管理者一覧の品質バッジ用（1行分）。集計 RPC と同じ判定基準に揃える。 */

export const ADMIN_PROPERTY_MIN_DESCRIPTION_CHARS = 100

export type AdminPropertyQualityFlags = {
    missingPrice: boolean
    missingImage: boolean
    noDeveloper: boolean
    shortDescription: boolean
}

function maxDescriptionLength(row: {
    description?: string | null
    description_en?: string | null
    description_th?: string | null
}): number {
    const a = (row.description ?? '').trim().length
    const b = (row.description_en ?? '').trim().length
    const c = (row.description_th ?? '').trim().length
    return Math.max(a, b, c)
}

function hasMainImage(row: { images?: string[] | null }): boolean {
    const imgs = row.images
    if (!imgs || !Array.isArray(imgs) || imgs.length < 1) return false
    return String(imgs[0] ?? '').trim().length > 0
}

/**
 * 一覧で表示する品質フラグ（取得済み行のみ評価。全件スキャンはしない）。
 */
export function getAdminPropertyQualityFlags(row: {
    price?: number | string | null
    images?: string[] | null
    developer_id?: string | null
    description?: string | null
    description_en?: string | null
    description_th?: string | null
}): AdminPropertyQualityFlags {
    const raw = row.price
    const n = raw == null || raw === '' ? null : Number(raw)
    const missingPrice = raw == null || raw === '' || !Number.isFinite(n) || n === 0

    return {
        missingPrice,
        missingImage: !hasMainImage(row),
        noDeveloper: row.developer_id == null || String(row.developer_id).trim() === '',
        shortDescription: maxDescriptionLength(row) <= ADMIN_PROPERTY_MIN_DESCRIPTION_CHARS,
    }
}

export function adminPropertyQualityFlagCount(flags: AdminPropertyQualityFlags): number {
    return [flags.missingPrice, flags.missingImage, flags.noDeveloper, flags.shortDescription].filter(Boolean).length
}

/** 物件名に Riviera が含まれるのに developer_id が無い → デベロッパー紐付けを推奨 */
export function shouldRecommendDeveloperForProperty(row: {
    title?: string | null
    developer_id?: string | null
}): boolean {
    const t = (row.title ?? '').toLowerCase()
    if (!t.includes('riviera')) return false
    return row.developer_id == null || String(row.developer_id).trim() === ''
}
