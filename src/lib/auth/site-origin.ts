/**
 * メール確認・OAuth の redirectTo に使うサイトのオリジン（スキーム + ホスト、パスなし）。
 *
 * この関数は主に Client Component のクリック／送信から呼ばれる。
 * その場合は **常に window.location.origin を優先**する。
 *
 * Vercel の環境変数に NEXT_PUBLIC_SITE_URL=http://localhost:3000 のまま入っていると、
 * 本番（独自ドメインや Vercel URL）で env だけが localhost のとき、redirectTo が localhost になり失敗する。
 * 実際にユーザーが開いているタブの origin が OAuth の戻り先と一致している必要がある。
 *
 * window が無いときだけ NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_BASE_URL にフォールバックする。
 */
export function getAuthSiteOrigin(): string {
    const trim = (s: string) => s.trim().replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }
    const fromEnv =
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL && trim(process.env.NEXT_PUBLIC_SITE_URL)) ||
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL && trim(process.env.NEXT_PUBLIC_BASE_URL)) ||
        "";
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
        return fromEnv;
    }
    return "";
}
