import {
  inferDataPlaneHostnameFromEnv,
  isDevelopmentDeploymentHost,
  resolveDataPlaneHostname,
} from '@/lib/env/deployment-target'

export type SupabasePublicConfig = { url: string; anonKey: string }

function warnDevIncomplete() {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[env] 開発用ホストと判定されましたが NEXT_PUBLIC_SUPABASE_URL_DEV / NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV が不足しています。本番用 Supabase に接続します。'
    )
  }
}

/**
 * 匿名キー＋URL（ブラウザ・サーバー共通）。NEXT_PUBLIC_* はビルド時にバンドルへ埋め込まれる。
 *
 * @param explicitHostname 例: headers の Host。未指定時は環境（NEXT_PUBLIC_SITE_URL 等）から推定。
 */
export function getSupabasePublicConfig(explicitHostname?: string | null): SupabasePublicConfig {
  const host = resolveDataPlaneHostname(explicitHostname ?? null)
  const useDevPair =
    isDevelopmentDeploymentHost(host) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL_DEV?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV?.trim())

  if (useDevPair) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!.trim(),
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV!.trim(),
    }
  }

  if (isDevelopmentDeploymentHost(host)) {
    warnDevIncomplete()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です（.env.local またはホスティングの Environment Variables）。'
    )
  }
  return { url, anonKey }
}

/** クライアント専用: window のホストで解決 */
export function getBrowserSupabasePublicConfig(): SupabasePublicConfig {
  const host =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : inferDataPlaneHostnameFromEnv()
  return getSupabasePublicConfig(host)
}

export type SupabaseServiceConfig = { url: string; serviceRoleKey: string }

/**
 * サービスロール。URL は公開設定と同一プロジェクトに揃える。
 */
export function getSupabaseServiceRoleConfig(explicitHostname?: string | null): SupabaseServiceConfig {
  const publicCfg = getSupabasePublicConfig(explicitHostname)
  const host = resolveDataPlaneHostname(explicitHostname ?? null)
  const isDev = isDevelopmentDeploymentHost(host)
  const devPublicOk =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL_DEV?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV?.trim())
  const useDev = isDev && devPublicOk

  if (useDev) {
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV?.trim()
    if (sk) {
      return { url: publicCfg.url, serviceRoleKey: sk }
    }
    console.warn(
      '[env] 開発用 Supabase に接続していますが SUPABASE_SERVICE_ROLE_KEY_DEV がありません。SUPABASE_SERVICE_ROLE_KEY を試みます（プロジェクトが一致しないと失敗します）。'
    )
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY が必要です（サーバー専用・コミットしないこと）。開発用 DB では SUPABASE_SERVICE_ROLE_KEY_DEV も利用できます。'
    )
  }
  return { url: publicCfg.url, serviceRoleKey }
}
