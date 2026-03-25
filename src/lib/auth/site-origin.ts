/**
 * メール確認・OAuth の redirectTo に使うサイトのオリジン（スキーム + ホスト、パスなし）。
 *
 * ローカル開発では、NEXT_PUBLIC_SITE_URL が本番のままだと OAuth の戻り先が本番になり PKCE が壊れる。
 * またポートが 3000 以外のとき env と実際のタブがずれる。ブラウザで localhost 系のときは常に window の origin を使う。
 *
 * Vercel 本番では NEXT_PUBLIC_SITE_URL にデプロイ URL を設定してください。
 */
function isLocalDevHostname(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export function getAuthSiteOrigin(): string {
    const trim = (s: string) => s.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) {
        try {
            if (isLocalDevHostname(new URL(window.location.origin).hostname)) {
                return window.location.origin;
            }
        } catch {
            /* 無視 */
        }
    }
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
