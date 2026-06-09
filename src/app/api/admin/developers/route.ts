import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'
import {
    escapeIlikePattern,
    parseAdminListLimit,
    parseAdminListPage,
} from '@/lib/admin-list-url'

/** 管理者: デベロッパー一覧 */
export async function GET(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    const page = parseAdminListPage(request.nextUrl.searchParams.get('page'))
    const limit = parseAdminListLimit(request.nextUrl.searchParams.get('limit'))
    const search = (request.nextUrl.searchParams.get('search') ?? '').trim().replace(/,/g, '')

    try {
        const admin = await createAdminClient()
        let q = admin.from('developers').select('*', { count: 'exact', head: false }).order('name')
        if (search) {
            q = q.ilike('name', `%${escapeIlikePattern(search)}%`)
        }
        const from = (page - 1) * limit
        const to = from + limit - 1
        const { data, error, count } = await q.range(from, to)

        if (error) {
            console.error('[api/admin/developers] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            developers: data ?? [],
            totalCount: typeof count === 'number' ? count : (data?.length ?? 0),
        })
    } catch (e) {
        console.error('[api/admin/developers] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/** 管理者: デベロッパー新規作成 */
export async function POST(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const body = await request.json()
        const admin = await createAdminClient()
        const { error } = await admin.from('developers').insert([body])
        if (error) {
            console.error('[api/admin/developers] POST', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/developers] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
