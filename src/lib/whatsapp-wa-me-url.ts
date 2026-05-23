import { parseThailandMobileToE164 } from '@/lib/thailand-mobile-e164'

/**
 * `wa.me` 用リンク（国番号のみ、先頭の + は除去）。
 * タイのローカル表記または E.164 を想定。解釈できない場合は null。
 */
export function buildWhatsAppWaMeUrl(
    phoneRaw: string,
    prefilledMessage?: string
): string | null {
    const trimmed = phoneRaw.trim()
    if (!trimmed) return null

    let e164: string | null = null
    if (/^\+[1-9]\d{8,14}$/.test(trimmed)) {
        e164 = trimmed
    } else {
        e164 = parseThailandMobileToE164(trimmed)
    }

    if (!e164) return null

    const waDigits = e164.replace(/^\+/, '')
    const base = `https://wa.me/${waDigits}`
    const msg = prefilledMessage?.trim()
    if (!msg) return base
    return `${base}?text=${encodeURIComponent(msg)}`
}
