/**
 * タイの携帯（089… / 092… / 065… 等）を E.164（+66…）へ。
 *
 * ※過去実装では「ナショナル先頭が 8 のときだけ」許可していたため、
 *   True などの 065〜 や dtac の 092〜 などで WhatsApp が出なかった。
 */

function isThaiNineDigitNational(nine: string): boolean {
    return nine.length === 9 && /^[689]\d{8}$/.test(nine)
}

export function parseThailandMobileToE164(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    let raw = trimmed
    if (raw.toLowerCase().startsWith('whatsapp:')) {
        raw = raw.slice('whatsapp:'.length).trim()
    }

    let digits = raw.replace(/\D/g, '')
    if (!digits) return null

    if (digits.startsWith('0066')) digits = digits.slice(4)

    // 「+」付き入力は数字列に落としているので、668912345678 形式はここへ来る
    if (digits.startsWith('66')) {
        const national = digits.slice(2)
        if (isThaiNineDigitNational(national)) {
            return `+66${national}`
        }
        return null
    }

    // 国内 0 はじまりを 1 本だけ除去（081… / 092… / 065…）
    if (digits.startsWith('0')) digits = digits.slice(1)
    if (isThaiNineDigitNational(digits)) {
        return `+66${digits}`
    }

    return null
}
