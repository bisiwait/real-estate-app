import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import { getPublicSiteUrl } from '@/lib/site-url'
import { NextRequest, NextResponse } from 'next/server'
import { getResendFromAddress } from '@/lib/resend-from'
import { lineOfficialPushText } from '@/lib/line-official-push'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getLineOfficialChannelAccessTokenForHostname } from '@/lib/env/line-data-plane'
import { fetchAgentLineAccessToken } from '@/lib/line-agent-credentials'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build')

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

/** DB 値および旧値（email_only / email_and_line）を正規化 */
function normalizeReplyChannel(ch: string | null | undefined): 'email' | 'line' {
  if (ch === 'line' || ch === 'email_and_line') return 'line'
  return 'email'
}

function channelLabelJa(mode: 'email' | 'line'): string {
  return mode === 'line' ? 'LINEで返信を希望' : 'メールで返信を希望'
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    console.log('Inquiry Webhook Payload:', JSON.stringify(payload, null, 2))

    const record = payload.record as InquiryRecord | undefined

    if (!record || !record.property_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('title, user_id')
      .eq('id', record.property_id)
      .single()

    if (propertyError || !property) {
      console.error('Error fetching property info:', propertyError)
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', property.user_id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile info:', profileError)
    }

    const agentEmail = profile?.email || 'onboarding@resend.dev'

    const replyMethod = normalizeReplyChannel(record.preferred_reply_channel)
    const lineUid = (record.line_user_id || '').trim() || null

    console.log(
      `Sending inquiry notification to: ${agentEmail} for property: ${property.title} (reply_method: ${replyMethod})`
    )

    const dashboardUrl = `${getPublicSiteUrl()}/jp/dashboard`

    const channelRow = `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">返信方法の希望</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${channelLabelJa(replyMethod)}</td>
            </tr>
            ${
              replyMethod === 'line'
                ? lineUid
                  ? `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">LINEユーザーID（Messaging）</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-size: 12px;">${lineUid}</td>
            </tr>`
                  : `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">LINEユーザーID</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #b45309;">未登録（LIFF 未取得の可能性）</td>
            </tr>`
                : ''
            }
            `

    const { data, error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: [agentEmail],
      subject: `【新着】物件「${property.title}」にお問い合わせがありました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">新着お問い合わせ通知</h2>

          <p style="font-size: 16px; color: #475569;">以下の物件に対して新しいお問い合わせがありました：</p>

          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>物件名:</strong> ${property.title}</p>
            <p style="margin: 5px 0;"><strong>物件ID:</strong> ${record.property_id}</p>
          </div>

          <h3 style="color: #1e293b; font-size: 18px; margin-top: 30px;">お問い合わせ内容</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; width: 120px; color: #64748b;">お名前</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${record.inquirer_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">メールアドレス</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${record.inquirer_email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">電話番号</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${record.inquirer_phone || 'なし'}</td>
            </tr>
            ${channelRow}
          </table>

          <div style="margin-top: 20px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-style: italic; color: #1e293b;">
            "${record.message}"
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 8px;">ダッシュボードで確認する</a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; text-align: center;">
            ※このメールはシステムによる自動送信です。心当たりのない場合は破棄してください。
          </p>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 16px; text-align: center; font-weight: 600;">
            Chonburi Home
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    /** 問い合わせ者への控えメールは /api/inquiries/confirm-email（フォーム送信直後）で送る */

    const ownerToken = property.user_id
      ? await fetchAgentLineAccessToken(supabase, property.user_id as string)
      : null
    const lineToken =
      ownerToken || getLineOfficialChannelAccessTokenForHostname(hostHeaderFromRequest(req))
    let linePushOk = false
    let linePushError: string | null = null

    if (replyMethod === 'line' && lineUid && lineToken) {
      const pushBody =
        process.env.LINE_INQUIRY_THANK_YOU_MESSAGE?.trim() || 'お問い合わせありがとうございます。担当よりご連絡いたします。'
      const pushResult = await lineOfficialPushText(lineUid, pushBody, lineToken)
      linePushOk = pushResult.ok
      if (!pushResult.ok) {
        linePushError = `${pushResult.status} ${pushResult.body || ''}`
        console.error('[inquiry-webhook] LINE push failed', linePushError)
      }
    }

    const notificationsMeta = {
      email_sent: true,
      resend_email_id: data?.id ?? null,
      line_push_attempted: replyMethod === 'line' && Boolean(lineUid && lineToken),
      line_push_ok: linePushOk,
      line_push_error: linePushError,
    }

    if (record.id) {
      const { error: logErr } = await supabase.from('inquiry_logs').insert({
        property_id: record.property_id,
        agent_id: property.user_id,
        inquiry_type: 'form',
        user_id: null,
        status: 'new',
        metadata: {
          source: 'web_form',
          inquiry_id: record.id,
          reply_method: replyMethod,
          preferred_reply_channel: replyMethod,
          line_user_id: lineUid,
          notifications: notificationsMeta,
        },
      })
      if (logErr) {
        console.error('[inquiry-webhook] inquiry_logs insert', logErr)
      }
    }

    return NextResponse.json({ success: true, id: data?.id, notifications: notificationsMeta })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Inquiry Webhook Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
