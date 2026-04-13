import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = await createAdminClient()
    const { data: rows, error } = await admin
        .from('agent_contacts')
        .select('id, agent_id, customer_name, customer_email, customer_phone, message, is_handled, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

    if (error) {
        console.error('[admin/agent-contacts] GET', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = rows ?? []
    const agentIds = [...new Set(list.map((r) => r.agent_id as string).filter(Boolean))]
    let nameById: Record<string, string | null> = {}
    if (agentIds.length > 0) {
        const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', agentIds)
        nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) ?? null]))
    }

    const merged = list.map((r) => ({
        ...r,
        agent_full_name: nameById[r.agent_id as string] ?? null,
    }))

    return NextResponse.json({ rows: merged })
}

export async function PATCH(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: { id?: string; is_handled?: boolean }
    try {
        body = (await req.json()) as { id?: string; is_handled?: boolean }
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const id = body.id?.trim()
    if (!id || !UUID_RE.test(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    if (typeof body.is_handled !== 'boolean') {
        return NextResponse.json({ error: 'is_handled must be boolean' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { error } = await admin.from('agent_contacts').update({ is_handled: body.is_handled }).eq('id', id)

    if (error) {
        console.error('[admin/agent-contacts] PATCH', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
