/**
 * Supabase Auth に組み込みの `line` プロバイダはありません。
 * LINE ログインは Dashboard で Custom OAuth / OIDC として追加し、`custom:...` 形式の識別子で呼び出します。
 *
 * @see https://supabase.com/docs/guides/auth/custom-oauth-providers
 */
export function getLineOAuthProviderId(): string {
    const v = process.env.NEXT_PUBLIC_SUPABASE_LINE_PROVIDER?.trim();
    if (v) return v;
    return "custom:line";
}
