/**
 * LINE 問い合わせフロー用。sessionStorage は WebView 切替で消えるため httpOnly でバックアップする。
 */
export const LINE_INQUIRY_PENDING_COOKIE = 'line_inquiry_pending_v1'

export const LINE_INQUIRY_PENDING_MAX_AGE_SEC = 15 * 60

/** クライアント・Cookie 共通（user id はサーバーのみ付与） */
export type LineInquiryPendingPayload = {
  v: 1
  propertyId: string
  locale: string
  name: string
  email: string
  message: string
  at: number
}

export type LineInquiryPendingStored = LineInquiryPendingPayload & { sub: string }

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALES = new Set(['jp', 'en', 'th'])

const MAX_NAME = 200
const MAX_EMAIL = 320
/** Cookie 4KB 制限を避けるため Cookie 保存時は本文を切り詰める（sessionStorage はフル保持） */
export const MAX_MESSAGE_COOKIE_CHARS = 3500

/** Cookie に収まるよう message を切り詰めたコピー（mutate しない） */
export function truncatePendingForCookie(p: LineInquiryPendingPayload): LineInquiryPendingPayload {
  if (p.message.length <= MAX_MESSAGE_COOKIE_CHARS) return p
  return {
    ...p,
    message: `${p.message.slice(0, MAX_MESSAGE_COOKIE_CHARS)}\n\n[…省略]`,
  }
}

const MAX_MESSAGE_CLIENT = 8000

export function isLineInquiryPendingPayload(
  o: unknown,
  opts?: { maxMessage?: number }
): o is LineInquiryPendingPayload {
  const maxMsg = opts?.maxMessage ?? MAX_MESSAGE_CLIENT
  if (!o || typeof o !== 'object') return false
  const x = o as Record<string, unknown>
  if (x.v !== 1) return false
  if (typeof x.propertyId !== 'string' || !UUID.test(x.propertyId)) return false
  if (typeof x.locale !== 'string' || !LOCALES.has(x.locale)) return false
  if (typeof x.name !== 'string' || x.name.length > MAX_NAME) return false
  if (typeof x.email !== 'string' || x.email.length > MAX_EMAIL) return false
  if (typeof x.message !== 'string' || x.message.length > maxMsg) return false
  if (typeof x.at !== 'number' || !Number.isFinite(x.at)) return false
  return true
}

export function isLineInquiryPendingStored(o: unknown): o is LineInquiryPendingStored {
  if (!isLineInquiryPendingPayload(o, { maxMessage: MAX_MESSAGE_COOKIE_CHARS + 120 }))
    return false
  const x = o as LineInquiryPendingStored
  return typeof x.sub === 'string' && x.sub.length > 0 && x.sub.length < 200
}
