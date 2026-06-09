import { createAdminClient } from '@/lib/supabase/server'
import { notifyAgentOfNewInquiry } from '@/lib/inquiry-agent-notification-email'
import { NextRequest, NextResponse } from 'next/server'

type InquiryRecord = {
  id?: string
  property_id?: string
  inquirer_name?: string
  inquirer_email?: string
  email?: string | null
  inquirer_phone?: string | null
  message?: string
  preferred_reply_channel?: string | null
  line_user_id?: string | null
}

/** Supabase Database Webhook / pg trigger からの問い合わせ通知（アプリ submit と重複時は inquiry_logs でスキップ） */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log('Inquiry Webhook Payload:', JSON.stringify(payload, null, 2))

    const record = payload.record as InquiryRecord | undefined

    if (!record || !record.property_id || !record.id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('title, user_id')
      .eq('id', record.property_id)
      .single()

    if (propertyError || !property?.user_id) {
      console.error('Error fetching property info:', propertyError)
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const result = await notifyAgentOfNewInquiry(supabase, {
      inquiryId: record.id,
      propertyId: record.property_id,
      propertyTitle: (property.title as string) || '物件',
      agentUserId: property.user_id as string,
      inquirerName: record.inquirer_name || '—',
      inquirerEmail: record.inquirer_email || record.email || '',
      inquirerPhone: record.inquirer_phone,
      message: record.message || '',
      preferredReplyChannel: record.preferred_reply_channel,
      lineUserId: record.line_user_id,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    if ('skipped' in result && result.skipped) {
      return NextResponse.json({ success: true, skipped: result.reason })
    }

    return NextResponse.json({ success: true, id: result.resendId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Inquiry Webhook Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
