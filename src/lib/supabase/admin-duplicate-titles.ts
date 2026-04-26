/**
 * 管理者物件一覧の「現在ページ」のタイトルについて、DB 上で重複しているタイトル集合を取得する。
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchAdminDuplicateTitlesOnPage(
    supabase: SupabaseClient,
    titles: string[]
): Promise<Set<string>> {
    const unique = [...new Set(titles.map((t) => (t ?? '').trim()).filter(Boolean))]
    if (unique.length === 0) return new Set()

    const { data, error } = await supabase.rpc('admin_duplicate_title_in_titles', {
        p_titles: unique,
    })

    if (error) {
        console.warn('[admin-duplicate-titles] rpc', error.message)
        return new Set()
    }

    const rows = (data ?? []) as string[]
    return new Set(rows.filter(Boolean))
}
