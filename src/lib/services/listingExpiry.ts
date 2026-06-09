export const LISTING_EXPIRY_DAYS = 30

export function listingExpiryIsoFromNow(days = LISTING_EXPIRY_DAYS): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}
