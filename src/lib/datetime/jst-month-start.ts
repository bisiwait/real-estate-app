/**
 * 日本時間（Asia/Tokyo）の暦での「今月1日 0:00」を表す瞬間を ISO 文字列で返す。
 * 管理画面の「今月のクリック数」と DB の clicked_at（timestamptz）を突き合わせる用途。
 */
export function startOfCurrentMonthJstIso(): string {
    const s = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })
    const ymd = s.slice(0, 10)
    const [y, m] = ymd.split('-').map(Number)
    if (!y || !m) {
        const d = new Date()
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
    }
    return new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+09:00`).toISOString()
}
