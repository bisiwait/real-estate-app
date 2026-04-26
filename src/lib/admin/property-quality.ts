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
    list_sort_price?: number | string | null
    rent_price?: number | string | null
    sale_price?: number | string | null
    images?: string[] | null
    developer_id?: string | null
    description?: string | null
    description_en?: string | null
    description_th?: string | null
}): AdminPropertyQualityFlags {
    const listRaw = row.list_sort_price
    const listN = listRaw == null || listRaw === '' ? null : Number(listRaw)
    const listHasValue = listN != null && Number.isFinite(listN) && listN > 0

    const rentRaw = row.rent_price
    const saleRaw = row.sale_price
    const rentN = rentRaw == null || rentRaw === '' ? null : Number(rentRaw)
    const saleN = saleRaw == null || saleRaw === '' ? null : Number(saleRaw)
    const hasRentSaleValue =
        (rentN != null && Number.isFinite(rentN) && rentN > 0) ||
        (saleN != null && Number.isFinite(saleN) && saleN > 0)

    const fallbackRaw = row.price
    const fallbackN = fallbackRaw == null || fallbackRaw === '' ? null : Number(fallbackRaw)
    const fallbackHasValue = fallbackN != null && Number.isFinite(fallbackN) && fallbackN > 0
    const missingPrice = !(listHasValue || hasRentSaleValue || fallbackHasValue)

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
