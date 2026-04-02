import { safeNextPath } from '@/lib/auth/safe-next-path'
import type { LineInquiryPendingPayload } from '@/lib/inquiry-line-pending-cookie'

/** httpOnly。auth/callback が Supabase 交換に失敗したとき、LINE の code を物件ページへ戻す */
export const LINE_INQUIRY_RETURN_PATH_COOKIE = 'line_inquiry_return_path'

type PostLineReturnBody = {
  path?: string
  pending?: LineInquiryPendingPayload
  clear_line_inquiry_pending?: boolean
}

/**
 * 復帰パスを httpOnly に保存。任意で問い合わせ下書きも Cookie にバックアップ（WebView 切替で sessionStorage が消える対策）。
 */
export async function postLineInquiryReturnPath(
  path: string,
  pending?: LineInquiryPendingPayload | null
): Promise<void> {
  if (typeof window === 'undefined') return
  const safe = safeNextPath(path)
  if (!safe) return
  const body: PostLineReturnBody = { path: safe }
  if (pending) body.pending = pending
  try {
    await fetch(`${window.location.origin}/api/inquiry/line-return`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* ネットワーク失敗時も handoff は続行 */
  }
}

/** 問い合わせ保存成功後に httpOnly 下書きを破棄 */
export async function clearLineInquiryPendingCookie(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch(`${window.location.origin}/api/inquiry/line-return`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_line_inquiry_pending: true }),
    })
  } catch {
    /* */
  }
}
