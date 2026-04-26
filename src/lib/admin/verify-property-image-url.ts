import { isSupabaseStorageHttpUrl } from '@/lib/property-image-url'

/** 管理者一覧で「実体確認」する対象（Supabase Storage の公開 URL のみ） */
export function shouldAuditStorageImageUrl(url: string | null | undefined): boolean {
    const s = String(url ?? '').trim()
    if (!s) return false
    return isSupabaseStorageHttpUrl(s)
}

/**
 * 公開 URL に HTTP で到達できるか（404 等はインポート不整合の目安）。
 * 外部 CDN や CORS で失敗する場合は「不明」として true を返し、誤検知を減らす。
 */
export async function verifyPublicImageUrlReachable(url: string, signal?: AbortSignal): Promise<boolean> {
    const u = String(url ?? '').trim()
    if (!u) return false
    try {
        let res = await fetch(u, { method: 'HEAD', signal, cache: 'no-store' })
        if (res.ok) return true
        if (res.status === 405) {
            res = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal, cache: 'no-store' })
            if (res.ok || res.status === 206) return true
            if (res.status === 404 || res.status === 403) return false
            return true
        }
        if (res.status === 404 || res.status === 403) return false
        return true
    } catch {
        return true
    }
}
