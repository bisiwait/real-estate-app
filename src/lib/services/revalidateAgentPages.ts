import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

const LOCALES = ['jp', 'en', 'th'] as const

/** エージェントの問い合わせ表示設定変更後、掲載物件・エージェント詳細の ISR を無効化 */
export async function revalidateAgentPublicPages(
    admin: SupabaseClient,
    agentId: string
) {
    const { data: properties } = await admin
        .from('properties')
        .select('id')
        .eq('user_id', agentId)
        .eq('status', 'published')
        .eq('is_approved', true)

    for (const locale of LOCALES) {
        revalidatePath(`/${locale}/agents/${agentId}`, 'page')
        for (const row of properties ?? []) {
            revalidatePath(`/${locale}/properties/${row.id}`, 'page')
        }
    }
}
