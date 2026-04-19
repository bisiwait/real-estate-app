/** 物件カード等で画像が無い・壊れているときのローカルプレースホルダー（必ずリポジトリに含める） */
export const PROPERTY_PLACEHOLDER_IMAGE = '/images/placeholder-property.svg'

const PROPERTY_IMAGES_BUCKET = 'property-images'
const AVATARS_STORAGE_BUCKET = 'avatars'

function normalizeSupabaseHttpToHttps(s: string): string {
    if (s.startsWith('http://') && /\.supabase\.(co|in)(\/|$)/i.test(s)) {
        return `https://${s.slice('http://'.length)}`
    }
    return s
}

/**
 * 一覧・カード用の画像 URL を整える。
 * - 空・空白のみ → プレースホルダー
 * - 古い http の Supabase Storage → https（Next/Image の remotePatterns は https のみ）
 */
export function normalizePropertyImageSrc(raw: unknown): string {
    if (raw == null) return PROPERTY_PLACEHOLDER_IMAGE
    const s = String(raw).trim()
    if (!s) return PROPERTY_PLACEHOLDER_IMAGE
    return normalizeSupabaseHttpToHttps(s)
}

function getSupabasePublicBase(storageBaseOverride?: string): string {
    return (
        typeof storageBaseOverride === 'string' && storageBaseOverride.trim()
            ? storageBaseOverride.trim()
            : typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
              ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
              : ''
    ).replace(/\/$/, '')
}

/** public バケットのオブジェクト URL から object key を取り出す（別プロジェクト ref の古い URL を現行 Supabase に寄せるため） */
function extractPublicStorageObjectKey(url: string, bucket: string): string | null {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = url.toLowerCase().indexOf(marker.toLowerCase())
    if (idx < 0) return null
    let key = url.slice(idx + marker.length)
    const q = key.indexOf('?')
    if (q >= 0) key = key.slice(0, q)
    key = key.replace(/^\/+/, '').replace(/\/+$/, '')
    return key.length > 0 ? key : null
}

/**
 * DB に旧 Supabase のホストで保存された public URL が残っていても、
 * 現在の NEXT_PUBLIC_SUPABASE_URL 配下の同じ object key に差し替える。
 */
function rewriteSupabasePublicStorageUrlToCurrentBase(
    httpsUrl: string,
    base: string,
    bucket: string
): string | null {
    const key = extractPublicStorageObjectKey(httpsUrl, bucket)
    if (!key) return null
    const cleanBase = base.replace(/\/$/, '')
    return `${cleanBase}/storage/v1/object/public/${bucket}/${key}`
}

/**
 * ギャラリー用: 相対パス（object key のみ）を公開 URL に直す。
 * 既に絶対 URL または `/` 始まりならそのまま（normalize のみ）。
 *
 * @param storageBaseOverride サーバーで hostname に応じた Supabase URL を渡す場合（省略時は NEXT_PUBLIC_SUPABASE_URL）
 */
export function resolvePropertyImageUrl(raw: unknown, storageBaseOverride?: string): string {
    const step = normalizePropertyImageSrc(raw)
    if (step === PROPERTY_PLACEHOLDER_IMAGE) return step

    const base = getSupabasePublicBase(storageBaseOverride)

    if (/^https?:\/\//i.test(step)) {
        if (base) {
            const rewritten = rewriteSupabasePublicStorageUrlToCurrentBase(
                step,
                base,
                PROPERTY_IMAGES_BUCKET
            )
            if (rewritten) return rewritten
        }
        return step
    }

    if (step.startsWith('/')) return step
    if (!base) return step
    const path = step.replace(/^\/+/, '')
    return `${base}/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/${path}`
}

/**
 * profiles.avatar_url 用。空は null（プレースホルダーアイコン側で表示）。
 * 旧 Supabase プロジェクトの public URL を現行 NEXT_PUBLIC_SUPABASE_URL に寄せる。
 */
export function resolveAvatarUrl(raw: unknown, storageBaseOverride?: string): string | null {
    if (raw == null) return null
    const s = String(raw).trim()
    if (!s) return null
    const step = normalizeSupabaseHttpToHttps(s)
    if (/^data:/i.test(step) || /^blob:/i.test(step)) return step

    const base = getSupabasePublicBase(storageBaseOverride)

    if (/^https?:\/\//i.test(step)) {
        if (base) {
            const rewritten = rewriteSupabasePublicStorageUrlToCurrentBase(
                step,
                base,
                AVATARS_STORAGE_BUCKET
            )
            if (rewritten) return rewritten
        }
        return step
    }

    if (step.startsWith('/')) return step
    if (!base) return step
    const path = step.replace(/^\/+/, '')
    return `${base}/storage/v1/object/public/${AVATARS_STORAGE_BUCKET}/${path}`
}
