import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'

export type ProfileAccessSnapshot = {
    isAdmin: boolean
    isAgent: boolean
    agentBlocked: boolean
}

export function profileAccessFromRow(
    row: {
        user_role?: string | null
        is_admin?: boolean | null
        status?: string | null
        deleted_at?: string | null
    } | null
): ProfileAccessSnapshot {
    if (!row) {
        return { isAdmin: false, isAgent: false, agentBlocked: false }
    }
    const isAdmin = row.is_admin === true || row.user_role === 'admin'
    const isAgent = row.user_role === 'agent'
    const agentBlocked =
        isAgent && (row.status === 'suspended' || row.deleted_at != null)
    return { isAdmin, isAgent, agentBlocked }
}

/** middleware / サーバー用。RLS をバイパスしてロール判定する */
export async function fetchProfileAccessForUser(
    userId: string,
    hostname?: string | null
): Promise<ProfileAccessSnapshot> {
    try {
        const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(hostname ?? null)
        const admin = createClient(url, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data, error } = await admin
            .from('profiles')
            .select('user_role, is_admin, status, deleted_at')
            .eq('id', userId)
            .maybeSingle()

        if (error) {
            console.error('[fetchProfileAccessForUser]', error.message)
            return { isAdmin: false, isAgent: false, agentBlocked: false }
        }

        return profileAccessFromRow(data)
    } catch (e) {
        console.error('[fetchProfileAccessForUser]', e)
        return { isAdmin: false, isAgent: false, agentBlocked: false }
    }
}
