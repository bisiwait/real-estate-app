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
