/**
 * メール確認・OAuth の redirectTo に使うサイトのオリジン（スキーム + ホスト、パスなし）。
 *
 * Vercel では NEXT_PUBLIC_SITE_URL に本番 URL（例: https://xxx.vercel.app）を必ず設定してください。
 * 未設定だと window.location.origin にフォールバックしますが、
 * Supabase の「Redirect URLs」と一致させるため env を推奨します。
 */
export function getAuthSiteOrigin(): string {
    const trim = (s: string) => s.trim().replace(/\/$/, "");
    const fromEnv =
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL && trim(process.env.NEXT_PUBLIC_SITE_URL)) ||
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL && trim(process.env.NEXT_PUBLIC_BASE_URL)) ||
        "";
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
        return fromEnv;
    }
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }
    return "";
}
