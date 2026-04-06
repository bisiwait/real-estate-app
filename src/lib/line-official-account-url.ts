/**
 * LINE 公式アカウントの友だち追加URL（例: https://line.me/R/ti/p/@basicId）かどうか。
 * パス内の @ は URL エンコード（%40）されていても可。
 */
export function isLineOfficialAccountAddFriendUrl(raw: string): boolean {
    const t = raw.trim()
    if (!t) return false
    let u: URL
    try {
        u = new URL(t)
    } catch {
        return false
    }
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (host !== 'line.me' && !host.endsWith('.line.me')) return false

    let path = u.pathname.replace(/\/+/g, '/')
    if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1)

    const prefix = '/R/ti/p/'
    const lower = path.toLowerCase()
    if (!lower.startsWith(prefix)) return false

    const encodedSeg = path.slice(prefix.length)
    if (!encodedSeg) return false

    let seg: string
    try {
        seg = decodeURIComponent(encodedSeg)
    } catch {
        return false
    }

    // Basic ID（@から始まる英数字・._- など。実際のIDに合わせてやや寛容に）
    return /^@[a-zA-Z0-9._-]{1,128}$/.test(seg)
}
