import { createClient } from '@/lib/supabase/server'
import { fetchProfileAccessForUser } from '@/lib/supabase/fetch-profile-access'

/** サーバー用。RLS をバイパスして管理者判定する */
export async function isAdmin() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    const access = await fetchProfileAccessForUser(user.id)
    return access.isAdmin
}

export async function getSessionProfileAccess() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, isAdmin: false, isAgent: false, agentBlocked: false }
    }

    const access = await fetchProfileAccessForUser(user.id)
    return { user, ...access }
}
