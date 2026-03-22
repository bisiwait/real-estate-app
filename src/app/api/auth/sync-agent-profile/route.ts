import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAgentProfileFromAuthUser } from '@/lib/auth/syncAgentProfile'

/**
 * ログイン直後など、auth の user_metadata が agent なのに profiles が未同期の場合に呼ぶ
 */
export async function POST() {
    const supabase = await createClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await syncAgentProfileFromAuthUser(user)
    if (!result.ok) {
        return NextResponse.json({ error: result.error || 'Sync failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
