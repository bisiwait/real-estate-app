/**
 * プロフィールに保存された LINE ID（@付き検索ID 等）から、ブラウザで開ける LINE リンクを生成する。
 */
export function buildLineContactUrl(lineIdRaw: string | null | undefined): string | null {
  if (!lineIdRaw?.trim()) return null
  const s = lineIdRaw.trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const pathId =
    s.startsWith('@') || s.startsWith('~') ? s : `@${s.replace(/^@+/g, '')}`
  const segment =
    pathId.startsWith('@') && pathId.length > 1
      ? `@${encodeURIComponent(pathId.slice(1))}`
      : encodeURIComponent(pathId)
  return `https://line.me/R/ti/p/${segment}`
}

/**
 * エージェントの「LINEで返信」用。
 * スマホでは `line://ti/p/...`、PC/フォールバックでは `https://line.me/ti/p/~...` 形式。
 * 既に http(s) の完全 URL の場合はそのまま（アプリスキームは付けない）。
 */
export function buildLineAgentReplyUrls(
  lineIdRaw: string | null | undefined
): { httpsUrl: string; appUrl: string | null } | null {
  if (!lineIdRaw?.trim()) return null
  const s = lineIdRaw.trim()
  if (/^https?:\/\//i.test(s)) {
    return { httpsUrl: s, appUrl: null }
  }
  const idForPath = s.startsWith('~') ? s : `~${s}`
  const seg = encodeURIComponent(idForPath)
  return {
    httpsUrl: `https://line.me/ti/p/${seg}`,
    appUrl: `line://ti/p/${seg}`,
  }
}

function lineAppUrlFromHttps(httpsUrl: string): string | null {
  try {
    const u = new URL(httpsUrl)
    if (u.hostname !== 'line.me' && !u.hostname.endsWith('.line.me')) return null
    const path = `${u.pathname.replace(/^\//, '')}${u.search}${u.hash}`
    return path ? `line://${path}` : null
  } catch {
    return null
  }
}

/**
 * リード詳細の「LINEで返信」用。プロフィールの `line_id` に ID または友だち追加 URL を保存する想定。
 * - http(s) で始まる → そのまま href
 * - line.me のパス形式（スキームなし）→ https を付与
 * - それ以外 → @ を除去し、`https://line.me/R/ti/p/~` 形式（パスは encode）
 */
export function buildLeadLineReplyUrls(
  lineContact: string | null | undefined
): { httpsUrl: string; appUrl: string | null } | null {
  const raw = lineContact?.trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    return { httpsUrl: raw, appUrl: lineAppUrlFromHttps(raw) }
  }
  if (/^line\.me\//i.test(raw) || /^www\.line\.me\//i.test(raw)) {
    const httpsUrl = `https://${raw.replace(/^https?:\/\//i, '')}`
    return { httpsUrl, appUrl: lineAppUrlFromHttps(httpsUrl) }
  }

  const idClean = raw.replace(/@/g, '').trim()
  if (!idClean) return null
  const pathCore = idClean.startsWith('~') ? idClean : `~${idClean}`
  const segment = encodeURIComponent(pathCore)
  const httpsUrl = `https://line.me/R/ti/p/${segment}`
  return { httpsUrl, appUrl: lineAppUrlFromHttps(httpsUrl) }
}
