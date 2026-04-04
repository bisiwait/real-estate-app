/**
 * データプレーン（Supabase / LINE 等）の接続先を、リクエストホストで切り替えるための判定。
 *
 * - localhost / 127.0.0.1 / ::1 → 開発扱い
 * - dev.chonburihome.com（完全一致）→ 開発扱い
 * - 上記以外 → 本番扱い
 */

/** Host ヘッダー値からポートを除いたホスト名（小文字） */
export function stripPortFromHost(host: string): string {
  const h = host.trim().toLowerCase()
  if (h.startsWith('[')) {
    const end = h.indexOf(']')
    if (end > 0) return h.slice(1, end)
    return h
  }
  const colon = h.lastIndexOf(':')
  if (colon > 0 && /^\d+$/.test(h.slice(colon + 1))) {
    return h.slice(0, colon)
  }
  return h
}

export function hostHeaderFromHeaders(headers: Headers): string | null {
  const xf = headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (xf) return stripPortFromHost(xf)
  const h = headers.get('host')?.trim()
  return h ? stripPortFromHost(h) : null
}

/** IncomingMessage 互換（Request / NextRequest） */
export function hostHeaderFromRequest(req: { headers: Headers }): string | null {
  return hostHeaderFromHeaders(req.headers)
}

/**
 * 明示ホストが無いとき（ビルド・unstable_cache・一部バッチ）用の推定。
 * 優先: window（クライアントのみ）→ NEXT_PUBLIC_SITE_URL → VERCEL_URL
 */
export function inferDataPlaneHostnameFromEnv(): string | null {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return stripPortFromHost(window.location.hostname)
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (site) {
    try {
      return stripPortFromHost(new URL(site).hostname)
    } catch {
      /* ignore */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    return stripPortFromHost(vercel.split(':')[0])
  }
  return null
}

/**
 * リクエスト由来のホストがあればそれを優先し、なければ環境から推定する。
 */
export function resolveDataPlaneHostname(explicitHostname: string | null | undefined): string | null {
  if (explicitHostname) return stripPortFromHost(explicitHostname)
  return inferDataPlaneHostnameFromEnv()
}

export function isDevelopmentDeploymentHost(hostname: string | null | undefined): boolean {
  if (hostname == null || hostname === '') return false
  const h = stripPortFromHost(hostname)
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === 'dev.chonburihome.com'
  )
}
