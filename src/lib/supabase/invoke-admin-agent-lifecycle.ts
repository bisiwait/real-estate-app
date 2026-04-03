import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminAgentLifecycleAction = 'suspend' | 'resume' | 'delete'

export type PropertyHandling = 'unpublish' | 'keep'

/**
 * Edge Function `admin-agent-lifecycle` を呼び出す（JWT は現在セッション）。
 * Supabase ダッシュボードで関数をデプロイし、NEXT_PUBLIC_SUPABASE_URL がプロジェクト URL である必要があります。
 */
export async function invokeAdminAgentLifecycle(
    supabase: SupabaseClient,
    action: AdminAgentLifecycleAction,
    targetUserId: string,
    options?: { propertyHandling?: PropertyHandling }
): Promise<{ ok?: boolean; error?: string }> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
        return { error: 'ログインセッションがありません。' }
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!base || !anon) {
        return { error: 'Supabase の環境変数が設定されていません。' }
    }

    const res = await fetch(`${base}/functions/v1/admin-agent-lifecycle`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: anon,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action,
            targetUserId,
            property_handling: options?.propertyHandling ?? 'unpublish',
        }),
    })

    let body: { error?: string; ok?: boolean } = {}
    try {
        body = await res.json()
    } catch {
        /* ignore */
    }

    if (!res.ok) {
        return { error: body.error || `操作に失敗しました（${res.status}）` }
    }
    return { ok: true, ...body }
}
