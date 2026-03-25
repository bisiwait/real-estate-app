const LOCALES = ['jp', 'en', 'th'] as const

/**
 * Supabase の「Redirect URLs」と一致させるコールバックパス。
 *
 * ダッシュボードでよくある「http://localhost:3000/auth/callback」のみ登録されている場合、
 * 「/jp/auth/callback」は許可リストに無く Site URL（/?code=）にフォールバックする。
 * localhost / Cloudflare Pages ではロケールなし /auth/callback を使う。
 *
 * Vercel 本番などでは /{locale}/auth/callback を登録している想定でロケール付きパスを返す。
 */
export function authCallbackPathForOrigin(origin: string, locale: string): string {
    const loc = LOCALES.includes(locale as (typeof LOCALES)[number]) ? locale : 'jp'
    try {
        const hostname = new URL(origin).hostname.toLowerCase()
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.pages.dev')) {
            return '/auth/callback'
        }
    } catch {
        /* 不正な origin */
    }
    return `/${loc}/auth/callback`
}

/** メール確認・OAuth・パスワードリセットの redirectTo 用の完全 URL（next はロケール付きアプリ内パス） */
export function buildAuthCallbackRedirectUrl(origin: string, locale: string, nextPath: string): string {
    const path = authCallbackPathForOrigin(origin, locale)
    return `${origin}${path}?next=${encodeURIComponent(nextPath)}`
}
