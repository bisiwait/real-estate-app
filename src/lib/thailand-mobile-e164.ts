/**
 * タイの携帯（08xxxxxxxx 等）を E.164（+668xxxxxxxx）へ。
 * WhatsApp / wa.me でよくある「頭の 0 付き」を想定した簡易バリデーション。
 */
export function parseThailandMobileToE164(input: string): string | null {
    const trimmed = input.trim()
    let rest = trimmed
    const lower = rest.toLowerCase()
    if (lower.startsWith('whatsapp:')) {
        rest = rest.slice('whatsapp:'.length).trim()
    }

    let digits = rest.replace(/\D/g, '')
    if (!digits.length) return null

    if (digits.startsWith('66')) {
        const national = digits.slice(2)
        if (national.length === 9 && national[0] === '8') {
            return `+66${national}`
        }
        return null
    }

    if (digits.startsWith('0')) {
        digits = digits.slice(1)
    }

    if (digits.length === 9 && digits[0] === '8') {
        return `+66${digits}`
    }

    if (digits.length === 11 && digits.startsWith('668') && digits[3] === '8') {
        return `+${digits}`
    }

    if (rest.startsWith('+') && rest.length >= 4) {
        const noPlus = rest.slice(1).replace(/\D/g, '')
        if (noPlus.startsWith('66') && noPlus.length >= 11) {
            return `+${noPlus}`
        }
    }

    return null
}
