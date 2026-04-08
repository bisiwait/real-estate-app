const DEFAULT_THROTTLE_MS = 60_000

export type PostLineInquiryLogPayload = {
  propertyId: string
  /** 物件オーナー（掲載エージェント）の user id。API で property.user_id と突き合わせる */
  agentId?: string
}

/**
 * LINE 起動や QR 表示の直前に呼ぶ。await せず送り、keepalive で遷移後も完了しやすくする。
 * 同一タブ・同一物件・同一 throttleScope では throttleMs 以内の連打は送らない（簡易スパム抑制）。
 * QR 表示と LINE 起動は別スコープ（続けて両方カウントしうる）。
 */
export function postLineInquiryLog(
  payload: PostLineInquiryLogPayload,
  options?: { throttleMs?: number; throttleScope?: string }
) {
  const pid = payload.propertyId?.trim()
  if (!pid) return
  const throttleMs = options?.throttleMs ?? DEFAULT_THROTTLE_MS
  const scope = options?.throttleScope ?? 'default'
  if (throttleMs > 0 && typeof window !== 'undefined') {
    try {
      const key = `lineInquiryCount:${pid}:${scope}`
      const last = Number(sessionStorage.getItem(key) || '0')
      const now = Date.now()
      if (now - last < throttleMs) return
      sessionStorage.setItem(key, String(now))
    } catch {
      /* sessionStorage 不可時はスロットルなしで送る */
    }
  }
  try {
    const body: Record<string, string> = { property_id: pid }
    const aid = payload.agentId?.trim()
    if (aid) body.agent_id = aid
    void fetch('/api/line/inquiry-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* noop */
  }
}
