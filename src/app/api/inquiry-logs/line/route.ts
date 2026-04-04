import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasUsableLineContact } from '@/lib/line-contact-url'
import { resolveOfficialLineAddFriendUrl } from '@/lib/line-official'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import {
  getLineOfficialChannelAccessTokenForHostname,
  getLineOfficialChannelSecretForHostname,
} from '@/lib/env/line-data-plane'

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const INTENT_TTL_HOURS = 72

function isOfficialLineRoutingEnabled(host: string | null): boolean {
  return Boolean(
    getLineOfficialChannelSecretForHostname(host)?.trim() &&
      getLineOfficialChannelAccessTokenForHostname(host)?.trim()
  )
}

function generateIntentNonce(): string {
  return randomBytes(5).toString('hex').toUpperCase()
}

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === '23505' || (err.message ?? '').toLowerCase().includes('duplicate')
}

export async function POST(req: Request) {
  try {
    const host = hostHeaderFromRequest(req)

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
    const officialOn = isOfficialLineRoutingEnabled(host)

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

    const { data: viewerProf } = await admin
      .from('profiles')
      .select('id, line_id')
      .eq('id', user.id)
      .maybeSingle()
    if (!viewerProf) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    if (!officialOn && !hasUsableLineContact(viewerProf.line_id)) {
      return NextResponse.json(
        {
          error: 'LINE contact required',
          code: 'LINE_CONTACT_REQUIRED',
        },
        { status: 400 }
      )
    }

    const { data: inserted, error: insErr } = await admin
      .from('inquiry_logs')
      .insert({
        property_id,
        user_id: user.id,
        agent_id: prop.user_id,
        inquiry_type: 'line',
        status: 'pending',
        metadata: officialOn
          ? { line_contact_mode: 'official_routing_pending' }
          : { line_contact_mode: 'direct_agent' },
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      console.error('inquiry-logs/line: insert', insErr)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    if (!officialOn) {
      return NextResponse.json({ ok: true })
    }

    const expiresAt = new Date(
      Date.now() + INTENT_TTL_HOURS * 3600 * 1000
    ).toISOString()

    let nonce = generateIntentNonce()
    for (let attempt = 0; attempt < 8; attempt++) {
      const { error: intErr } = await admin.from('line_official_inquiry_intents').insert({
        nonce,
        inquiry_log_id: inserted.id,
        property_id,
        viewer_user_id: user.id,
        agent_id: prop.user_id,
        expires_at: expiresAt,
        status: 'pending',
        metadata: {},
      })

      if (!intErr) {
        const add_friend_url = await resolveOfficialLineAddFriendUrl(host)
        return NextResponse.json({
          ok: true,
          official_routing: {
            nonce,
            add_friend_url,
            expires_in_hours: INTENT_TTL_HOURS,
          },
        })
      }

      if (isUniqueViolation(intErr)) {
        nonce = generateIntentNonce()
        continue
      }

      console.error('inquiry-logs/line: intent insert', intErr)
      break
    }

    await admin.from('inquiry_logs').delete().eq('id', inserted.id)
    return NextResponse.json(
      { error: '公式LINE用の問い合わせ番号を発行できませんでした。しばらくしてから再度お試しください。' },
      { status: 500 }
    )
  } catch (e) {
    console.error('inquiry-logs/line', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
