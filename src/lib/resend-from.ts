/**
 * Resend の送信元アドレス。
 *
 * 未検証の `onboarding@resend.dev` では、テスト用途として Resend アカウント所有者のメール宛にしか送れません。
 * 問い合わせ人・エージェントなど任意の宛先へ送るには、resend.com/domains でドメインを検証し、
 * Vercel の RESEND_FROM にメールアドレス、または「表示名 <noreply@検証済みドメイン>」を設定してください。
 *
 * Vercel では値の先頭末尾に `"` を付けると、そのまま文字列に含まれて Resend が拒否することがあります。
 */

const PLAIN_EMAIL = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/

function stripOuterQuotes(s: string): string {
    let v = s.trim()
    while (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
    ) {
        v = v.slice(1, -1).trim()
    }
    return v
}

/** 全角の <> を半角に（コピペ対策） */
function normalizeAngleBrackets(s: string): string {
    return s.replace(/\uFF1C/g, '<').replace(/\uFF1E/g, '>')
}

function normalizeWhitespace(s: string): string {
    return s.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * 環境変数 RESEND_FROM を Resend が受け付ける形に整える。
 */
export function normalizeResendFromEnv(raw: string): string {
    let v = stripOuterQuotes(raw)
    v = normalizeWhitespace(v)
    v = normalizeAngleBrackets(v)
    v = stripOuterQuotes(v)

    // メールアドレスのみ（例: noreply@example.com）
    if (PLAIN_EMAIL.test(v)) {
        return `Chonburi Home <${v}>`
    }

    // Name <email@domain>
    const named = v.match(/^(.+?)\s*<\s*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\s*>$/s)
    if (named) {
        const name = named[1].trim()
        const email = named[2].trim()
        return `${name} <${email}>`
    }

    // "Name email@domain" のように <> が無いがメールは含まれる
    const embedded = v.match(/([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/)
    if (embedded && !v.includes('<')) {
        const email = embedded[1]
        const namePart = v.replace(email, '').trim() || 'Chonburi Home'
        return `${namePart} <${email}>`
    }

    return v
}

export function getResendFromAddress(): string {
    const raw = process.env.RESEND_FROM
    if (!raw?.trim()) {
        return 'Chonburi Home <onboarding@resend.dev>'
    }
    return normalizeResendFromEnv(raw)
}

/** Resend が「検証済みドメインが必要」と返したときの API 用ヒント（日本語） */
export const RESEND_DOMAIN_HINT_JA =
    'Resend（resend.com/domains）で送信元ドメインを検証し、Vercel の環境変数 RESEND_FROM に「Chonburi Home <noreply@あなたのドメイン>」を設定してください。設定前は、Resend に登録した自分のメール宛にしか送れません。'

/** Invalid `from` 時のヒント */
export const RESEND_FROM_FORMAT_HINT_JA =
    'Vercel の RESEND_FROM は次のどちらかにしてください（値の先頭末尾に引用符 " は付けない）。例: noreply@yourdomain.com または Chonburi Home <noreply@yourdomain.com>'

export function resendErrorNeedsVerifiedDomain(message: string): boolean {
    return /verify a domain|testing emails to your own email|only send testing emails/i.test(
        message
    )
}

export function resendErrorInvalidFrom(message: string): boolean {
    return /invalid [`']from[`']|invalid.*from field/i.test(message)
}
