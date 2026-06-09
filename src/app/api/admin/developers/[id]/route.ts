import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id } = await context.params
        const body = await request.json()
        const admin = await createAdminClient()
        const { error } = await admin.from('developers').update(body).eq('id', id)
        if (error) {
            console.error('[api/admin/developers/[id]] PATCH', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/developers/[id]] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id } = await context.params
        const admin = await createAdminClient()
        const { error } = await admin.from('developers').delete().eq('id', id)
        if (error) {
            console.error('[api/admin/developers/[id]] DELETE', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/developers/[id]] DELETE unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
