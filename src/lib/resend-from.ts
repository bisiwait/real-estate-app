/**
 * Resend の送信元アドレス。
 *
 * 未検証の `onboarding@resend.dev` では、テスト用途として Resend アカウント所有者のメール宛にしか送れません。
 * 問い合わせ人・エージェントなど任意の宛先へ送るには、resend.com/domains でドメインを検証し、
 * Vercel の RESEND_FROM に「表示名 <noreply@検証済みドメイン>」を設定してください。
 */
export function getResendFromAddress(): string {
    const raw = process.env.RESEND_FROM?.trim()
    if (raw) return raw
    return 'Chonburi Home <onboarding@resend.dev>'
}

/** Resend が「検証済みドメインが必要」と返したときの API 用ヒント（日本語） */
export const RESEND_DOMAIN_HINT_JA =
    'Resend（resend.com/domains）で送信元ドメインを検証し、Vercel の環境変数 RESEND_FROM に「Chonburi Home <noreply@あなたのドメイン>」を設定してください。設定前は、Resend に登録した自分のメール宛にしか送れません。'

export function resendErrorNeedsVerifiedDomain(message: string): boolean {
    return /verify a domain|testing emails to your own email|only send testing emails/i.test(
        message
    )
}
