/** 物件カード等で画像が無い・壊れているときのローカルプレースホルダー（必ずリポジトリに含める） */
export const PROPERTY_PLACEHOLDER_IMAGE = '/images/placeholder-property.svg'

/**
 * 一覧・カード用の画像 URL を整える。
 * - 空・空白のみ → プレースホルダー
 * - 古い http の Supabase Storage → https（Next/Image の remotePatterns は https のみ）
 */
export function normalizePropertyImageSrc(raw: unknown): string {
    if (raw == null) return PROPERTY_PLACEHOLDER_IMAGE
    const s = String(raw).trim()
    if (!s) return PROPERTY_PLACEHOLDER_IMAGE
    if (s.startsWith('http://') && /\.supabase\.co(\/|$)/i.test(s)) {
        return `https://${s.slice('http://'.length)}`
    }
    return s
}
