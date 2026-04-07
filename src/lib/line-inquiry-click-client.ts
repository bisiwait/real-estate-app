export type LineInquiryClickSource = 'sticky_bar' | 'inquiry_form'

/**
 * LINE 起動直前に呼ぶ。keepalive でページ遷移後も送信完了しやすくする。
 */
export function postLineInquiryClick(payload: { propertyId: string; source: LineInquiryClickSource }) {
    const pid = payload.propertyId?.trim()
    if (!pid) return
    try {
        const body = JSON.stringify({ property_id: pid, source: payload.source })
        void fetch('/api/line/inquiry-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => {})
    } catch {
        /* noop */
    }
}
