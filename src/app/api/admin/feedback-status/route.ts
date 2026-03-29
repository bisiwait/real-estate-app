import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'

const ALLOWED_STATUS = new Set(['new', 'in_progress', 'completed'])

export async function PATCH(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { id?: string; status?: string }
    try {
        body = (await req.json()) as { id?: string; status?: string }
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const id = body.id?.trim()
    const status = body.status?.trim()
    if (!id || !status || !ALLOWED_STATUS.has(status)) {
        return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { error } = await admin.from('feedback').update({ status }).eq('id', id)

    if (error) {
        console.error('[admin/feedback-status]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
