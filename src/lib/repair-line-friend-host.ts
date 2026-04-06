const LINE_ME_SINGLE_SEGMENT_BLOCKLIST = new Set(
  ['download', 'about', 'help', 'home', 'blog', 'news', 'terms', 'login', 'register', 'touch', 'n'].map((s) =>
    s.toLowerCase()
  )
)

/**
 * `https://line.me/RkXyf5D` のように、lin.ee のスラッグを誤って line.me ホストに載せた URL を
 * `https://lin.ee/RkXyf5D` に戻す。正規の友だち追加（`/R/ti/p/...` など複数パス）は触らない。
 *
 * コピペで `line.me/短いコード` とだけ入ると normalize が `https://line.me/コード` にし、404 になるため。
 */
export function repairMistypedLinEeOnLineMeHost(url: string): string {
  const t = url.trim()
  if (!t) return t
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return t
    const host = u.hostname.toLowerCase()
    if (host !== 'line.me' && host !== 'www.line.me') return t
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length !== 1) return t
    const seg = parts[0]!
    if (LINE_ME_SINGLE_SEGMENT_BLOCKLIST.has(seg.toLowerCase())) return t
    if (!/^[A-Za-z0-9]{5,14}$/.test(seg)) return t
    // lin.ee の短いパスは多くが大小英字混在。単語のみの誤検知を減らす
    if (!/[a-z]/.test(seg) || !/[A-Z]/.test(seg)) return t
    return `https://lin.ee/${seg}${u.search}${u.hash}`
  } catch {
    return t
  }
}
