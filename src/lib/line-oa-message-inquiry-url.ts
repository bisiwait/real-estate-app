import { normalizeLineFriendUrlInput } from '@/lib/line-contact-url'
import { expandShortLineFriendUrlServer } from '@/lib/expand-line-friend-url'
import { repairMistypedLinEeOnLineMeHost } from '@/lib/repair-line-friend-host'
import { basicIdOrUrlToAddFriendUrl } from '@/lib/line-official'

export { getPropertyOwnerLineInquiryRawInput } from '@/lib/property-owner-line-inquiry'

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
 * 短縮 URL はサーバーで fetch 展開する。取れない場合は null。
 */
export async function resolveLineOfficialBasicIdForOaMessage(
  rawInput: string,
  _hostname?: string | null
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

  return null
}

/**
 * 公式 oaMessage ＋下書き本文。
 * `?text=` 形式は LINE 入力欄に「text=…」が混入することがあるため、
 * query にはキー名を付けず `encodeURIComponent(本文)` のみを付与する（/R/msg/text/ と同様の扱い）。
 */
export function buildLineOaMessageUrl(atBasicId: string, text: string): string {
  const raw = atBasicId.trim()
  const id = raw.startsWith('@') ? raw : `@${raw.replace(/^@+/, '')}`
  const u = new URL(`https://line.me/R/oaMessage/${id}/`)
  const body = text.trim()
  if (body) {
    u.search = encodeURIComponent(body)
  }
  return u.toString()
}

const LINE_INQUIRY_SITE_NAME = 'ChonburiHome'

export function resolveLinePropertyTitle(
  property: LinePropertyTitleFields,
  locale: string
): string {
  const title =
    locale === 'en'
      ? (property.title_en || property.title_ja || property.title || '').trim()
      : locale === 'th'
        ? (property.title_th || property.title_en || property.title_ja || property.title || '').trim()
        : (property.title_ja || property.title_en || property.title || '').trim()
  return (
    title ||
    (locale === 'jp' ? '物件' : locale === 'th' ? 'ประกาศ' : 'this listing')
  )
}

/**
 * 表示中タイトル・ページ URL から下書き本文を組み立てる（クライアント用）。
 * 改行で URL を独立行にし、スマホでタップしやすくする。
 */
export function buildPropertyLineInquiryPrefillMessageForParts(
  lang: string,
  propertyPageUrl: string,
  propertyTitle: string
): string {
  const name =
    propertyTitle.trim() ||
    (lang === 'en' ? 'this listing' : lang === 'th' ? 'ประกาศ' : '物件')
  const url = propertyPageUrl.trim()

  if (lang === 'en') {
    return [
      `I found you through ${LINE_INQUIRY_SITE_NAME}.`,
      '',
      name,
      url,
      '',
      'Could you please check the vacancy status for this property?',
      'Thank you.',
    ].join('\n')
  }

  if (lang === 'th') {
    return [
      `ติดต่อผ่าน ${LINE_INQUIRY_SITE_NAME} ค่ะ`,
      '',
      name,
      url,
      '',
      'รบกวนขอทราบสถานะห้องว่างของประกาศนี้ด้วยค่ะ',
      'ขอบคุณค่ะ',
    ].join('\n')
  }

  return [
    `${LINE_INQUIRY_SITE_NAME}を見て連絡しました。`,
    '',
    name,
    url,
    '',
    'この物件の空室状況を確認していただけますか？',
    'よろしくお願いします。',
  ].join('\n')
}

/**
 * LINE 問い合わせの下書き本文（改行あり・物件詳細 URL 付き）。
 * 全体を `encodeURIComponent` してクエリに載せる。`?text=` は使わない。
 */
export function buildPropertyLineInquiryPrefillMessage(
  property: LinePropertyTitleFields,
  locale: string,
  propertyPageUrl: string
): string {
  const name = resolveLinePropertyTitle(property, locale)
  return buildPropertyLineInquiryPrefillMessageForParts(locale, propertyPageUrl, name)
}

/**
 * 既存の line.me 問い合わせ URL の下書き部分だけ差し替える（クライアントで href を最新化する用）。
 */
export function replaceLineInquiryUrlPrefill(
  officialUrl: string,
  newPrefillBody: string
): string {
  try {
    const u = new URL(officialUrl)
    const body = newPrefillBody.trim()
    if (body) {
      u.search = encodeURIComponent(body)
    } else {
      u.search = ''
    }
    return u.toString()
  } catch {
    return officialUrl
  }
}

/**
 * 物件ページの LINE 問い合わせボタン用 URL。lin.ee 等は内部で @ID に寄せ oaMessage + 下書き文に統一。
 */
export async function buildPropertyLineInquiryUrlServer(
  rawInput: string,
  property: LinePropertyTitleFields,
  locale: string,
  hostname: string | null | undefined,
  propertyPageUrl: string
): Promise<string> {
  const msg = buildPropertyLineInquiryPrefillMessage(property, locale, propertyPageUrl)
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
    const body = msg.trim()
    if (body) {
      u.search = encodeURIComponent(body)
    } else {
      u.search = ''
    }
    return u.toString()
  } catch {
    return expanded
  }
}
