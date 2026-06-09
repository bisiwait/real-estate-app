import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: フィードバック一覧（プロフィール付き） */
export async function GET(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    const status = request.nextUrl.searchParams.get('status')?.trim() ?? 'all'

    try {
        const admin = await createAdminClient()
        let query = admin
            .from('feedback')
            .select('*, profile:profiles(full_name, email)')
            .order('created_at', { ascending: false })

        if (status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) {
            console.error('[api/admin/feedback] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ feedbacks: data ?? [] })
    } catch (e) {
        console.error('[api/admin/feedback] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
