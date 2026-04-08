/**
 * LINE 起動や QR 表示の直前に呼ぶ。await せず送り、keepalive で遷移後も完了しやすくする。
 */
export function postLineInquiryLog(payload: { propertyId: string }) {
  const pid = payload.propertyId?.trim()
  if (!pid) return
  try {
    void fetch('/api/line/inquiry-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: pid }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* noop */
  }
}
