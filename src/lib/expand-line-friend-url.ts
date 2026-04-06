import { unstable_cache } from 'next/cache'

function isLinEeHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'lin.ee' || h.endsWith('.lin.ee')
}

function isLineMeFamilyHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'line.me' || h.endsWith('.line.me')
}

async function expandLinEeOnce(startUrl: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetch(startUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'ChonburiHome/1.0 (friend URL expander)',
      },
    })
    clearTimeout(timeout)
    const finalUrl = res.url
    const fu = new URL(finalUrl)
    if (!isLineMeFamilyHost(fu.hostname)) {
      console.warn('[expandLineFriendUrl] unexpected host after redirect', fu.hostname)
      return startUrl
    }
    fu.hash = ''
    return fu.toString()
  } catch (e) {
    clearTimeout(timeout)
    console.warn('[expandLineFriendUrl] fetch failed', e)
    return startUrl
  }
}

/**
 * 友だち追加用 `https://lin.ee/...` をサーバーでリダイレクト追跡し、`https://line.me/R/ti/p/...` へ展開する。
 * LINE 内蔵ブラウザでは短縮 URL のままだと「URLを確認してください」になりやすい。
 * それ以外の URL はそのまま返す（同一入力は unstable_cache で 24h）。
 */
export async function expandShortLineFriendUrlServer(url: string): Promise<string> {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return trimmed
    if (!isLinEeHost(u.hostname)) return trimmed
  } catch {
    return trimmed
  }

  return unstable_cache(
    async () => expandLinEeOnce(trimmed),
    ['expand-lin-ee-friend', trimmed],
    { revalidate: 86_400 }
  )()
}
