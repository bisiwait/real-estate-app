import { parseThailandMobileToE164 } from '@/lib/thailand-mobile-e164'

/**
 * `wa.me` 用リンク（海外番号のみ、桁は国番号＋市内局番、先頭の + は除去）。
 *
 * +E.164、タイのローカル、668xxxxxxxx / 668xxxxxxxx （+なし）、日本の国番込み桁などを試す。
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

    /** + 無し・記号のみ除去した桁列（タイ 668… / 日本 8190… 等） */
    if (!e164) {
        const digits = trimmed.replace(/\D/g, '')
        if (/^66\d{9}$/.test(digits)) {
            e164 = `+${digits}`
        } else if (/^81[1-9]\d{8,11}$/.test(digits)) {
            e164 = `+${digits}`
        }
    }

    if (!e164) return null

    const waDigits = e164.replace(/^\+/, '')
    const base = `https://wa.me/${waDigits}`
    const msg = prefilledMessage?.trim()
    if (!msg) return base
    return `${base}?text=${encodeURIComponent(msg)}`
}
