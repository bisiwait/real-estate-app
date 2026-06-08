import { createClient as createBaseClient } from '@supabase/supabase-js'
import { inferDataPlaneHostnameFromEnv } from '@/lib/env/deployment-target'
import { getSupabasePublicConfig, getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'

/**
 * Creates a Supabase client that doesn't use cookies.
 * This is safe for both Server and Client Components to fetch PUBLIC data.
 * It will NOT have access to the user's session.
 *
 * 接続先は NEXT_PUBLIC_SITE_URL / VERCEL_URL から推定（unstable_cache 内など Host が無い文脈向け）。
 * リクエスト単位で揃えたい場合は `createStaticClientForHostname` を使う。
 *
 * サーバー側の公開物件 SSR では RLS 影響を避けるため `createStaticServiceClient*` を優先すること。
 */
export function createStaticClient() {
    const { url, anonKey } = getSupabasePublicConfig(null)
    return createBaseClient(url, anonKey)
}

/** Server Component 等で `headers()` から取ったホストを渡すと、dev.chonburihome.com / localhost で開発 DB に切り替わる */
export function createStaticClientForHostname(hostname: string | null | undefined) {
    const { url, anonKey } = getSupabasePublicConfig(hostname ?? null)
    return createBaseClient(url, anonKey)
}

/**
 * サーバー専用。公開物件・エージェントプロフィール等の SSR 用（service role で RLS をバイパス）。
 * ブラウザでは絶対に呼ばないこと。
 */
export function createStaticServiceClient() {
    assertServerOnly('createStaticServiceClient')
    const host = inferDataPlaneHostnameFromEnv()
    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(host)
    return createBaseClient(url, serviceRoleKey)
}

/** Server Component 等でホストに合わせた service role クライアント */
export function createStaticServiceClientForHostname(hostname: string | null | undefined) {
    assertServerOnly('createStaticServiceClientForHostname')
    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(hostname ?? null)
    return createBaseClient(url, serviceRoleKey)
}

function assertServerOnly(label: string) {
    if (typeof window !== 'undefined') {
        throw new Error(`${label} is server-only`)
    }
}
