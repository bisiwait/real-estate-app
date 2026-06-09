import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/** エージェント向けプラン情報（RLS 回避） */
export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('profiles')
            .select('plan, plan_type, current_period_end, is_admin, user_role')
            .eq('id', user.id)
            .maybeSingle()

        if (error) {
            console.error('[api/agent/plan] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const isAgent =
            data.user_role === 'agent' || data.is_admin === true || data.user_role === 'admin'
        if (!isAgent) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.json({ profile: data })
    } catch (e) {
        console.error('[api/agent/plan] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
