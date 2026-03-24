import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['pending', 'replied', 'viewing', 'won', 'lost'])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    let body: { status?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const status = body.status?.trim()
    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('inquiry_logs')
      .update({ status })
      .eq('id', id)
      .eq('agent_id', user.id)
      .select('id, status')
      .maybeSingle()

    if (error) {
      console.error('inquiry_logs PATCH', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, lead: data })
  } catch (e) {
    console.error('inquiry_logs PATCH', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
