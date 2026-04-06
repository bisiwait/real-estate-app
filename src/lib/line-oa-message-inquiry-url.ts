import { normalizeLineFriendUrlInput } from '@/lib/line-contact-url'
import { expandShortLineFriendUrlServer } from '@/lib/expand-line-friend-url'
import { repairMistypedLinEeOnLineMeHost } from '@/lib/repair-line-friend-host'
import { basicIdOrUrlToAddFriendUrl, tryResolveOfficialBasicIdViaMessagingApi } from '@/lib/line-official'

export type LinePropertyTitleFields = {
  id?: string | null
  title?: string | null
  title_ja?: string | null
  title_en?: string | null
  title_th?: string | null
}

/**
 * 友だち追加用に解決した https URL から @Basic ID を取り出す（/R/ti/p/ または /R/oaMessage/）。
 */
export function extractAtBasicIdFromLineFriendOrOaHttpsUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host !== 'line.me' && host !== 'www.line.me') return null
    const p = u.pathname
    const oa = p.match(/^\/R\/oaMessage\/(@[^/]+)\/?/i)
    if (oa) return oa[1]
    const ti = p.match(/^\/R\/ti\/p\/([^/]+)/i)
    if (!ti) return null
    const seg = decodeURIComponent(ti[1])
    if (seg.startsWith('@')) return seg
    if (seg.startsWith('~')) return null
    return `@${seg.replace(/^@+/, '')}`
  } catch {
    return null
  }
}

function isLinEeHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === 'lin.ee' || h.endsWith('.lin.ee')
}

/**
 * lin.ee / line.me 友だち追加 URL または @Basic ID から oaMessage 用の @ID を解決する。
 * 展開が必要なときはサーバーで fetch し、取れなければ Messaging API bot/info にフォールバック。
 */
export async function resolveLineOfficialBasicIdForOaMessage(
  rawInput: string,
  hostname?: string | null
): Promise<string | null> {
  const t = normalizeLineFriendUrlInput(rawInput).trim()
  if (!t) return null

  if (/^@[A-Za-z0-9._-]{2,128}$/.test(t)) return t

  let httpsUrl = t
  if (!/^https?:\/\//i.test(t)) {
    httpsUrl = basicIdOrUrlToAddFriendUrl(t)
  } else {
    httpsUrl = repairMistypedLinEeOnLineMeHost(t)
  }

  try {
    const host = new URL(httpsUrl).hostname
    if (!isLinEeHostname(host)) {
      const id = extractAtBasicIdFromLineFriendOrOaHttpsUrl(httpsUrl)
      if (id) return id
    }
  } catch {
    /* */
  }

  const expanded = await expandShortLineFriendUrlServer(httpsUrl)
  const fromExpanded = extractAtBasicIdFromLineFriendOrOaHttpsUrl(expanded)
  if (fromExpanded) return fromExpanded

  return tryResolveOfficialBasicIdViaMessagingApi(hostname ?? null)
}

/**
 * 直通: `https://line.me/R/oaMessage/@BasicId/?text=...`（公式 oaMessage・下書き付きトーク）
 */
export function buildLineOaMessageUrl(atBasicId: string, text: string): string {
  const raw = atBasicId.trim()
  const id = raw.startsWith('@') ? raw : `@${raw.replace(/^@+/, '')}`
  const body = text.trim()
  const q = body ? `?text=${encodeURIComponent(body)}` : ''
  return `https://line.me/R/oaMessage/${id}/${q}`
}

/** oaMessage の下書き本文（物件名＋空室の一文） */
export function buildPropertyLineInquiryPrefillMessage(
  property: LinePropertyTitleFields,
  locale: string
): string {
  const title =
    locale === 'en'
      ? (property.title_en || property.title_ja || property.title || '').trim()
      : locale === 'th'
        ? (property.title_th || property.title_en || property.title_ja || property.title || '').trim()
        : (property.title_ja || property.title_en || property.title || '').trim()
  const name =
    title ||
    (locale === 'jp' ? '物件' : locale === 'th' ? 'ประกาศ' : 'Property')
  return `${name}の空室状況を教えてください`
}

/**
 * 物件ページの LINE 問い合わせボタン用 URL。lin.ee 等は内部で @ID に寄せ oaMessage + 下書き文に統一。
 */
export async function buildPropertyLineInquiryUrlServer(
  rawInput: string,
  property: LinePropertyTitleFields,
  locale: string,
  hostname?: string | null
): Promise<string> {
  const msg = buildPropertyLineInquiryPrefillMessage(property, locale)
  const basicId = await resolveLineOfficialBasicIdForOaMessage(rawInput, hostname)
  if (basicId) {
    return buildLineOaMessageUrl(basicId, msg)
  }

  let httpsUrl = normalizeLineFriendUrlInput(rawInput).trim()
  if (!/^https?:\/\//i.test(httpsUrl)) {
    httpsUrl = basicIdOrUrlToAddFriendUrl(httpsUrl)
  } else {
    httpsUrl = repairMistypedLinEeOnLineMeHost(httpsUrl)
  }
  const expanded = await expandShortLineFriendUrlServer(httpsUrl)
  try {
    const u = new URL(expanded)
    u.searchParams.set('text', msg)
    return u.toString()
  } catch {
    return expanded
  }
}
