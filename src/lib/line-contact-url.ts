/**
 * DB 保存用: 前後の空白を除去。URL らしき値はそのまま、それ以外（ID）では @ をすべて除去（line.me/R/ti/p に @ が入るとアプリでエラーになるため）。
 */
export function normalizeStoredLineContact(raw: string | null | undefined): string {
  const t = (raw ?? '').trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (/^line\.me\//i.test(t) || /^www\.line\.me\//i.test(t)) return t
  return t.replace(/@/g, '').trim()
}

/**
 * プロフィールに保存された LINE 連絡先から、ブラウザで開ける LINE リンクを生成する。
 */
export function buildLineContactUrl(lineIdRaw: string | null | undefined): string | null {
  const normalized = normalizeStoredLineContact(lineIdRaw ?? '')
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^line\.me\//i.test(normalized) || /^www\.line\.me\//i.test(normalized)) {
    return `https://${normalized.replace(/^https?:\/\//i, '').trim()}`
  }
  const pathCore = normalized.startsWith('~') ? normalized : `~${normalized}`
  return `https://line.me/R/ti/p/${encodeURIComponent(pathCore)}`
}

/**
 * エージェントの「LINEで返信」用。
 * スマホでは `line://ti/p/...`、PC/フォールバックでは `https://line.me/ti/p/~...` 形式。
 * 既に http(s) の完全 URL の場合はそのまま（アプリスキームは付けない）。
 */
export function buildLineAgentReplyUrls(
  lineIdRaw: string | null | undefined
): { httpsUrl: string; appUrl: string | null } | null {
  const s = (lineIdRaw ?? '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) {
    return { httpsUrl: s, appUrl: null }
  }
  const idNoAt = s.replace(/@/g, '').trim()
  if (!idNoAt) return null
  const idForPath = idNoAt.startsWith('~') ? idNoAt : `~${idNoAt}`
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
  // コピペの前後空白はリンク切れの原因になるため常に trim
  const raw = (lineContact ?? '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    return { httpsUrl: raw, appUrl: lineAppUrlFromHttps(raw) }
  }
  if (/^line\.me\//i.test(raw) || /^www\.line\.me\//i.test(raw)) {
    const httpsUrl = `https://${raw.replace(/^https?:\/\//i, '').trim()}`
    return { httpsUrl, appUrl: lineAppUrlFromHttps(httpsUrl) }
  }

  // ID 系: @ を line.me のパスに含めると「ユーザーが見つかりません」になりがちなので除去
  const idClean = raw.replace(/@/g, '').trim()
  if (!idClean) return null
  const pathCore = idClean.startsWith('~') ? idClean : `~${idClean}`
  const segment = encodeURIComponent(pathCore)
  const httpsUrl = `https://line.me/R/ti/p/${segment}`
  return { httpsUrl, appUrl: lineAppUrlFromHttps(httpsUrl) }
}
