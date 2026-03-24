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

/** LINE ID を line.me/R/ti/p 用のパスセグメントに（@ はそのまま、それ以外は先頭に ~） */
function lineIdToRTiPSegment(raw: string): string {
  const s = raw.trim()
  if (s.startsWith('@')) {
    const inner = s.slice(1).replace(/^@+/g, '')
    return `@${encodeURIComponent(inner)}`
  }
  const withTilde = s.startsWith('~') ? s : `~${s}`
  return encodeURIComponent(withTilde)
}

/**
 * リード詳細の「LINEで返信」用。
 * 友だち追加 URL を最優先。なければ LINE ID で https://line.me/R/ti/p/~… 形式。
 */
export function buildLeadLineReplyUrls(
  friendUrl: string | null | undefined,
  lineId: string | null | undefined
): { httpsUrl: string; appUrl: string | null } | null {
  const f = friendUrl?.trim()
  if (f) {
    if (/^https?:\/\//i.test(f)) {
      return { httpsUrl: f, appUrl: lineAppUrlFromHttps(f) }
    }
    if (/^line\.me\//i.test(f) || /^www\.line\.me\//i.test(f)) {
      const httpsUrl = `https://${f.replace(/^https?:\/\//i, '')}`
      return { httpsUrl, appUrl: lineAppUrlFromHttps(httpsUrl) }
    }
  }

  const id = lineId?.trim()
  if (!id) return null
  if (/^https?:\/\//i.test(id)) {
    return { httpsUrl: id, appUrl: lineAppUrlFromHttps(id) }
  }

  const segment = lineIdToRTiPSegment(id)
  const httpsUrl = `https://line.me/R/ti/p/${segment}`
  return {
    httpsUrl,
    appUrl: lineAppUrlFromHttps(httpsUrl),
  }
}
