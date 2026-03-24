const LOCALES = ['jp', 'en', 'th'] as const

/**
 * オープンリダイレクトを防ぎつつ、ロケール付きアプリ内パスのみ許可する。
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null
  let path: string
  try {
    path = decodeURIComponent(raw.trim())
  } catch {
    return null
  }
  if (!path.startsWith('/') || path.includes('//')) return null
  const head = path.split('/').filter(Boolean)[0]
  if (!LOCALES.includes(head as (typeof LOCALES)[number])) return null
  return path
}
