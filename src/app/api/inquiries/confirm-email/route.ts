import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendInquirerConfirmationEmail } from '@/lib/inquiry-inquirer-confirmation-email'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normEmail(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

/**
 * 問い合わせフォーム送信直後に呼ぶ。ログインユーザーのメールと inquirer_email が一致するときだけ
 * 送信者宛に受付控えメールを送る。
 *
 * ※ inquiries は RLS で owner（エージェント）のみ SELECT 可のため、inquiry_id ではなくフォーム内容で検証する。
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const {
      data: { user },
    } = await supabaseAuth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
    }

    let body: {
      property_id?: string
      inquirer_email?: string
      inquirer_name?: string
      message?: string
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : ''
    if (!propertyId || !UUID_RE.test(propertyId)) {
      return NextResponse.json({ error: 'property_id が不正です。' }, { status: 400 })
    }

    const inquirerEmail = typeof body.inquirer_email === 'string' ? body.inquirer_email.trim() : ''
    const inquirerName = typeof body.inquirer_name === 'string' ? body.inquirer_name.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!inquirerEmail || normEmail(inquirerEmail) !== normEmail(user.email)) {
      return NextResponse.json(
        { error: 'お問い合わせのメールアドレスがログイン中のアカウントと一致しません。' },
        { status: 403 }
      )
    }

    if (!inquirerName || !message) {
      return NextResponse.json({ error: 'お名前とお問い合わせ内容が必要です。' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data: property, error: pErr } = await admin
      .from('properties')
      .select('title')
      .eq('id', propertyId)
      .maybeSingle()

    if (pErr || !property?.title) {
      console.warn('[confirm-email] property not found', propertyId, pErr?.message)
      return NextResponse.json({ error: '物件が見つかりません。' }, { status: 404 })
    }

    const result = await sendInquirerConfirmationEmail({
      propertyTitle: property.title,
      inquirerEmail,
      inquirerName,
      message,
    })

    if (!result.ok) {
      const status = result.code === 'no_api_key' ? 503 : 422
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      )
    }

    return NextResponse.json({ success: true, resend_id: result.resendId ?? null })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[confirm-email]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
