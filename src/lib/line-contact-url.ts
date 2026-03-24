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
