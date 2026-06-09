import { NextRequest, NextResponse } from 'next/server'
import { requireAgentApiSession } from '@/lib/agent/require-agent-api-session'
import {
    checkPropertySaveDuplicatesAdmin,
    pickPropertySaveFields,
} from '@/lib/properties/agent-save-property'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'

/** エージェント: 物件新規作成（RLS 回避） */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAgentApiSession()
        if ('error' in auth) return auth.error

        const { session } = auth
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

        const title = typeof body.title === 'string' ? body.title.trim() : ''
        const dup = await checkPropertySaveDuplicatesAdmin(session.admin, {
            title,
            description: typeof body.description === 'string' ? body.description : null,
            checkDescriptionPrefix: body.checkDescriptionPrefix === true,
        })
        if (!dup.ok) {
            return NextResponse.json({ error: dup.message }, { status: 400 })
        }

        const row = pickPropertySaveFields(body)
        if (session.isAdmin && 'is_approved' in body) {
            row.is_approved = body.is_approved === true
        } else if ('is_approved' in row) {
            delete row.is_approved
        }

        row.user_id = session.user.id
        if (!row.expiry_date) {
            row.expiry_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
        row.updated_at = new Date().toISOString()
        if (!Array.isArray(row.images)) row.images = []

        const { data, error } = await session.admin
            .from('properties')
            .insert(row)
            .select('id')
            .single()

        if (error) {
            console.error('[api/properties] POST', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        revalidatePropertyListPages()
        return NextResponse.json({ property: data })
    } catch (e) {
        console.error('[api/properties] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
