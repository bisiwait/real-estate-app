/** 問い合わせ者の LINE 連絡先として有効か（空・空白のみは false） */
export function hasUsableLineContact(raw: string | null | undefined): boolean {
  return normalizeStoredLineContact(raw ?? '').length > 0
}

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

/**
 * line.me 上で line:// ディープリンク化してよいパスのみ true。
 * `https://line.me/RkXyf5D` のように lin.ee のスラッグを誤って line.me に載せると、
 * 無条件変換で `line://RkXyf5D` となり LINE が「URLを確認」と出すためホワイトリストする。
 */
function lineMePathAllowsAppDeepLink(pathname: string): boolean {
  return (
    /^\/R\/ti\/p(\/|$)/.test(pathname) ||
    pathname.startsWith('/R/oaMessage/') ||
    /^\/ti\/p(\/|$)/.test(pathname)
  )
}

/** https の line.me URL から LINE アプリ用 line:// を生成（公式トーク／友だち追加の既知パスのみ） */
export function lineAppUrlFromHttps(httpsUrl: string): string | null {
  try {
    const u = new URL(httpsUrl)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const host = u.hostname.toLowerCase()
    // liff.line.me 等は別用途のため、line:// へ載せ替えない
    if (host !== 'line.me' && host !== 'www.line.me') return null
    if (!lineMePathAllowsAppDeepLink(u.pathname)) return null
    const path = `${u.pathname.replace(/^\//, '')}${u.search}${u.hash}`
    return path ? `line://${path}` : null
  } catch {
    return null
  }
}

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g

/** 友だち追加URLのコピペ用（前後空白・ゼロ幅文字を除去） */
export function normalizeLineFriendUrlInput(raw: string): string {
  return (raw ?? '').trim().replace(ZERO_WIDTH_RE, '')
}

/**
 * 物件ページ等の「LINEで友だち追加」リンク用 href。
 * line.me の https URL は line:// に寄せると、LINE 内蔵ブラウザや別タブで https を開いたときの 404 を避けやすい。
 * lin.ee 等は https のまま。
 */
export function lineAddFriendLinkHref(publicUrl: string): string {
  const clean = normalizeLineFriendUrlInput(publicUrl)
  if (!clean) return clean
  let normalized = clean
  try {
    const u = new URL(clean)
    if (u.protocol === 'http:') {
      normalized = clean.replace(/^http:/i, 'https:')
    }
  } catch {
    return clean
  }
  return lineAppUrlFromHttps(normalized) ?? clean
}

/** LINE アプリ内 WebView かどうか（ユーザーエージェント簡易判定） */
export function isLineInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /\bLine\//i.test(navigator.userAgent)
}

/**
 * LINE 内蔵ブラウザで `location.assign(https://…)` すると、lin.ee の友だち追加短縮URLが
 * 「LINEを最新バージョンに…／URLを確認」で失敗しやすい。通常のアンカークリックに任せる。
 */
export function shouldUseLineInAppAssignWorkaround(href: string): boolean {
  const clean = normalizeLineFriendUrlInput(href)
  if (!clean.startsWith('http')) return false
  try {
    const u = new URL(clean)
    if (u.hostname === 'lin.ee' || u.hostname.endsWith('.lin.ee')) return false
    return true
  } catch {
    return false
  }
}

/**
 * リード詳細の「LINEで返信」用。プロフィールの `line_id` に ID または友だち追加 URL を保存する想定。
 * - http(s) で始まる → そのまま href
 * - line.me のパス形式（スキームなし）→ https を付与
 * - それ以外 → @ を除去し、`https://line.me/R/ti/p/~` 形式（パスは encode）
 */
/** 物件ページの「LINE問い合わせ」で開く URL。公式の @BasicId なら oaMessage で下書き付き、その他は友だち追加／トーク用 URL（下書きなし）。 */
export type LineInquiryEntryMode = 'oa_prefill' | 'open_chat'

export function buildLineInquiryEntryUrl(
  lineContact: string | null | undefined,
  prefilledMessage: string
): { url: string; mode: LineInquiryEntryMode } | null {
  const raw = (lineContact ?? '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    return { url: raw, mode: 'open_chat' }
  }

  if (/^line\.me\//i.test(raw) || /^www\.line\.me\//i.test(raw)) {
    const full = `https://${raw.replace(/^https?:\/\//i, '').trim()}`
    return { url: full, mode: 'open_chat' }
  }

  if (raw.startsWith('@') && raw.length > 1) {
    const basicId = raw
    const msg = prefilledMessage.trim()
    const q = msg ? `?${encodeURIComponent(msg)}` : ''
    return {
      url: `https://line.me/R/oaMessage/${basicId}/${q}`,
      mode: 'oa_prefill',
    }
  }

  const friendUrl = buildLineContactUrl(raw)
  if (!friendUrl) return null
  return { url: friendUrl, mode: 'open_chat' }
}

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
