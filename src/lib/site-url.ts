/**
 * 公開サイトのオリジン（末尾スラッシュなし）。
 * メタデータ・OGP・Stripe の success_url、メール内リンクなどに使用。
 *
 * 優先順位: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_BASE_URL → VERCEL_URL（プレビュー用）
 * 本番で独自ドメインの OGP を正しく出すには、Vercel（Production）で
 * NEXT_PUBLIC_SITE_URL=https://chonburihome.com を必ず設定してください。
 */

function trimOrigin(s: string): string {
    return s.trim().replace(/\/$/, '')
}

function firstValidHttpUrl(...candidates: (string | undefined)[]): string | null {
    for (const raw of candidates) {
        if (!raw) continue
        const u = trimOrigin(raw)
        if (/^https?:\/\//i.test(u)) return u
    }
    return null
}

export function getPublicSiteUrl(): string {
    const fromEnv = firstValidHttpUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_BASE_URL)
    if (fromEnv) return fromEnv

    // Vercel Production では独自ドメインの OGP・リダイレクトと一致させるため、明示 URL を必須にする
    if (process.env.VERCEL_ENV === 'production') {
        throw new Error(
            '[getPublicSiteUrl] Vercel Production では NEXT_PUBLIC_SITE_URL（例: https://chonburihome.com）が必須です。'
        )
    }

    if (process.env.VERCEL_URL) {
        return `https://${trimOrigin(process.env.VERCEL_URL)}`
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            '[getPublicSiteUrl] 本番ビルドには NEXT_PUBLIC_SITE_URL（または NEXT_PUBLIC_BASE_URL）の設定が必要です。'
        )
    }

    // ローカル開発: .env.local に NEXT_PUBLIC_SITE_URL を推奨（未設定時のみフォールバック）
    return 'http://localhost:3000'
}
