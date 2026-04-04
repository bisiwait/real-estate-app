import { createClient as createBaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

/**
 * Creates a Supabase client that doesn't use cookies.
 * This is safe for both Server and Client Components to fetch PUBLIC data.
 * It will NOT have access to the user's session.
 *
 * 接続先は NEXT_PUBLIC_SITE_URL / VERCEL_URL から推定（unstable_cache 内など Host が無い文脈向け）。
 * リクエスト単位で揃えたい場合は `createStaticClientForHostname` を使う。
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
