import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * エージェント登録時の user_metadata を profiles に反映（サービスロール・RLS バイパス）
 */
export async function syncAgentProfileFromAuthUser(user: User): Promise<{ ok: boolean; error?: string }> {
    const m = user.user_metadata || {}
    if (m.user_role !== 'agent') {
        return { ok: true }
    }

    const admin = await createAdminClient()
    const phone =
        (typeof m.phone === 'string' && m.phone.trim()) ||
        (typeof m.phone_number === 'string' && m.phone_number.trim()) ||
        null

    const row: Record<string, unknown> = {
        id: user.id,
        user_role: 'agent',
        email: user.email ?? null,
        full_name: typeof m.full_name === 'string' ? m.full_name.trim() || null : null,
        company_name: typeof m.company_name === 'string' ? m.company_name.trim() || null : null,
        line_id: typeof m.line_id === 'string' ? m.line_id.trim() || null : null,
        phone,
    }

    if (typeof m.target_area === 'string' && m.target_area.trim()) {
        row.target_area = m.target_area.trim()
    }

    let { error } = await admin.from('profiles').upsert(row, { onConflict: 'id' })

    if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('target_area') || error.code === 'PGRST204') {
            delete row.target_area
            const retry = await admin.from('profiles').upsert(row, { onConflict: 'id' })
            if (retry.error) {
                console.error('syncAgentProfile retry error:', retry.error)
                return { ok: false, error: retry.error.message }
            }
            return { ok: true }
        }
        console.error('syncAgentProfile error:', error)
        return { ok: false, error: error.message }
    }

    return { ok: true }
}
