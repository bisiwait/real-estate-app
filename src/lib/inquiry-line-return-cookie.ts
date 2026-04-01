import { safeNextPath } from '@/lib/auth/safe-next-path'

/** httpOnly。auth/callback が Supabase 交換に失敗したとき、LINE の code を物件ページへ戻す */
export const LINE_INQUIRY_RETURN_PATH_COOKIE = 'line_inquiry_return_path'

export async function postLineInquiryReturnPath(path: string): Promise<void> {
  if (typeof window === 'undefined') return
  const safe = safeNextPath(path)
  if (!safe) return
  try {
    await fetch(`${window.location.origin}/api/inquiry/line-return`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: safe }),
    })
  } catch {
    /* ネットワーク失敗時も handoff は続行 */
  }
}
