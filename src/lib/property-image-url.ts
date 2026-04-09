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

const PROPERTY_IMAGES_BUCKET = 'property-images'

/**
 * ギャラリー用: 相対パス（object key のみ）を公開 URL に直す。
 * 既に絶対 URL または `/` 始まりならそのまま（normalize のみ）。
 */
export function resolvePropertyImageUrl(raw: unknown): string {
    const step = normalizePropertyImageSrc(raw)
    if (step === PROPERTY_PLACEHOLDER_IMAGE) return step
    if (/^https?:\/\//i.test(step)) return step
    if (step.startsWith('/')) return step
    const base =
        typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
            ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '')
            : ''
    if (!base) return step
    const path = step.replace(/^\/+/, '')
    return `${base}/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/${path}`
}
