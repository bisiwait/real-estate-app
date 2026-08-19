export const LISTING_EXPIRY_DAYS = 30

export function listingExpiryIsoFromNow(days = LISTING_EXPIRY_DAYS): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

/** 掲載期限切れ（公開サイトの一覧・詳細 URL 直アクセス以外では非表示扱い） */
export function isListingExpired(expiryDate: string | null | undefined, now = Date.now()): boolean {
    if (!expiryDate?.trim()) return false
    const ts = Date.parse(expiryDate)
    if (!Number.isFinite(ts)) return false
    return ts <= now
}

export type ListingVisibilityFields = {
    status?: string | null
    is_approved?: boolean | null
    expiry_date?: string | null
}

/** 公開一覧 API と同じ「サイトに表示される」条件 */
export function isListingVisibleOnSite(
    property: ListingVisibilityFields,
    now = Date.now()
): boolean {
    if (property.status !== 'published') return false
    if (property.is_approved !== true) return false
    return !isListingExpired(property.expiry_date, now)
}
