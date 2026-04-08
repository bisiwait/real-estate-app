import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as { property_id?: string; agent_id?: string }
  const property_id = typeof b.property_id === 'string' ? b.property_id.trim() : ''
  const agent_id_client =
    typeof b.agent_id === 'string' && UUID_RE.test(b.agent_id.trim()) ? b.agent_id.trim() : ''

  if (!UUID_RE.test(property_id)) {
    return NextResponse.json({ error: 'Invalid property_id' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    const { data: prop, error: pErr } = await admin
      .from('properties')
      .select('id, user_id')
      .eq('id', property_id)
      .maybeSingle()

    if (pErr) {
      console.error('[line/inquiry-log] property select', pErr)
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
    if (!prop?.user_id) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    if (agent_id_client && agent_id_client !== prop.user_id) {
      return NextResponse.json({ error: 'agent_id mismatch' }, { status: 403 })
    }

    const { error: iErr } = await admin.from('line_inquiry_counts').insert({
      agent_id: prop.user_id,
      property_id: prop.id,
    })

    if (iErr) {
      console.error('[line/inquiry-log] insert line_inquiry_counts', iErr)
      return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[line/inquiry-log]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
