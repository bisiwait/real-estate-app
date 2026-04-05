import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 物件オーナー（エージェント）の LINE Messaging API チャネルアクセストークン。
 * profile_line_messaging_credentials は RLS で本人のみ；サービスロールの admin クライアントから読む。
 */
export async function fetchAgentLineAccessToken(
    admin: SupabaseClient,
    ownerUserId: string
): Promise<string | null> {
    const { data, error } = await admin
        .from('profile_line_messaging_credentials')
        .select('line_channel_access_token')
        .eq('user_id', ownerUserId)
        .maybeSingle()

    if (error) {
        console.warn('[line-agent-credentials] fetch token', error.message)
        return null
    }
    const t = data?.line_channel_access_token?.trim()
    return t || null
}
