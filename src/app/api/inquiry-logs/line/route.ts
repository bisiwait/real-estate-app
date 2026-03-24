import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('inquiry-logs/line: SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }

    let body: { property_id?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const property_id = body.property_id?.trim()
    if (!property_id || !UUID_RE.test(property_id)) {
      return NextResponse.json({ error: 'Invalid property_id' }, { status: 400 })
    }

    const supabaseAuth = await createClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await createAdminClient()

    const { data: prop, error: propErr } = await admin
      .from('properties')
      .select('user_id')
      .eq('id', property_id)
      .maybeSingle()

    if (propErr) {
      console.error('inquiry-logs/line: property lookup', propErr)
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!prop?.user_id) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!prof) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { error: insErr } = await admin.from('inquiry_logs').insert({
      property_id,
      user_id: user.id,
      agent_id: prop.user_id,
      inquiry_type: 'line',
      status: 'pending',
    })

    if (insErr) {
      console.error('inquiry-logs/line: insert', insErr)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('inquiry-logs/line', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
