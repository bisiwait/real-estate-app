import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const inquiryId = new URL(req.url).searchParams.get('inquiry_id')?.trim()
    if (!inquiryId || !UUID_RE.test(inquiryId)) {
        return NextResponse.json({ error: 'Invalid inquiry_id' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data: rows, error } = await admin
        .from('inquiry_replies')
        .select('id, message, created_at, sender_id')
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('[admin/inquiry-replies]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = rows ?? []
    const senderIds = [...new Set(list.map((r) => r.sender_id).filter(Boolean))] as string[]

    let nameById = new Map<string, string | null>()
    if (senderIds.length > 0) {
        const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', senderIds)
        nameById = new Map((profs ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]))
    }

    const replies = list.map((r) => ({
        id: r.id as string,
        message: r.message as string,
        created_at: r.created_at as string,
        sender_id: (r.sender_id as string | null) ?? null,
        sender_name: r.sender_id ? nameById.get(r.sender_id as string) ?? null : null,
    }))

    return NextResponse.json({ replies })
}
