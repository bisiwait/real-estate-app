import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: ブロードキャスト用の公開物件一覧 */
export async function GET() {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('properties')
            .select('*, area:areas(name)')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('[api/admin/broadcast/properties] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ properties: data ?? [] })
    } catch (e) {
        console.error('[api/admin/broadcast/properties] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
