/**
 * サーバー側メタデータ・OGP・絶対 URL 用。
 * 優先: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_BASE_URL → VERCEL_URL → 本番フォールバック
 */
export const CANONICAL_SITE_ORIGIN = 'https://chonburihome.com'

function trimOrigin(s: string): string {
    return s.trim().replace(/\/$/, '')
}

export function getPublicSiteUrl(): string {
    const a = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL && trimOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    const b = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL && trimOrigin(process.env.NEXT_PUBLIC_BASE_URL)
    for (const u of [a, b]) {
        if (u && /^https?:\/\//i.test(u)) return u
    }
    if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
        return `https://${trimOrigin(process.env.VERCEL_URL)}`
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        return CANONICAL_SITE_ORIGIN
    }
    return 'http://localhost:3000'
}
