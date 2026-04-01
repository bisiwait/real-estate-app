import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  getResendFromAddress,
  RESEND_DOMAIN_HINT_JA,
  RESEND_FROM_FORMAT_HINT_JA,
  resendErrorInvalidFrom,
  resendErrorNeedsVerifiedDomain,
} from '@/lib/resend-from'
import { lineOfficialPushText } from '@/lib/line-official-push'
import { linePushFailureUserMessage, normalizeInquiryReplyChannel } from '@/lib/inquiry-channel'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type InquiryRow = {
  id: string
  property_id: string
  owner_id: string
  inquirer_name: string | null
  inquirer_email: string | null
  preferred_reply_channel: string | null
  line_user_id: string | null
}

/**
 * 管理者が inquiries に対しメールまたは LINE Push で返信する。
 * inquiry_replies 記録・inquiry_logs（admin_reply）・is_read 更新まで一括。
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUser = await createClient()
    const {
      data: { user },
    } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      inquiry_id?: string
      channel?: string
      subject?: string
      message?: string
    }

    const inquiryId = typeof body.inquiry_id === 'string' ? body.inquiry_id.trim() : ''
    const channelRaw = typeof body.channel === 'string' ? body.channel.trim().toLowerCase() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const subjectRaw = typeof body.subject === 'string' ? body.subject.trim() : ''

    if (!inquiryId || !UUID_RE.test(inquiryId)) {
      return NextResponse.json({ error: 'Invalid inquiry_id' }, { status: 400 })
    }
    if (channelRaw !== 'email' && channelRaw !== 'line') {
      return NextResponse.json({ error: 'channel は email または line です。' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'message が必要です。' }, { status: 400 })
    }
    if (message.length > 4500) {
      return NextResponse.json({ error: '本文が長すぎます（4500文字以内）。' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data: inquiry, error: inqErr } = await admin
      .from('inquiries')
      .select('id, property_id, owner_id, inquirer_name, inquirer_email, preferred_reply_channel, line_user_id')
      .eq('id', inquiryId)
      .maybeSingle()

    if (inqErr || !inquiry) {
      console.warn('[admin/inquiries/reply] inquiry', inqErr?.message)
      return NextResponse.json({ error: 'お問い合わせが見つかりません。' }, { status: 404 })
    }

    const row = inquiry as InquiryRow
    const preferred = normalizeInquiryReplyChannel(row.preferred_reply_channel)

    if (channelRaw === 'email' && preferred !== 'email') {
      return NextResponse.json(
        { error: 'このお問い合わせはメール返信の希望ではありません。' },
        { status: 400 }
      )
    }
    if (channelRaw === 'line') {
      if (preferred !== 'line') {
        return NextResponse.json(
          { error: 'このお問い合わせは LINE 返信の希望ではありません。' },
          { status: 400 }
        )
      }
      const uid = row.line_user_id?.trim()
      if (!uid) {
        return NextResponse.json(
          { error: 'LINE ユーザーIDが記録されていません。メールでの連絡をご検討ください。' },
          { status: 422 }
        )
      }
    }

    const { data: property } = await admin
      .from('properties')
      .select('title')
      .eq('id', row.property_id)
      .maybeSingle()

    const propertyTitle = (property?.title as string | undefined)?.trim() || '物件'
    const inquirerName = row.inquirer_name?.trim() || 'お客様'

    const { data: adminProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    const agentEmail = adminProfile?.email?.trim() || user.email?.trim() || ''
    const agentDisplayName = adminProfile?.full_name?.trim() || '担当'

    let resendId: string | null = null

    if (channelRaw === 'email') {
      const to = row.inquirer_email?.trim()
      if (!to) {
        return NextResponse.json({ error: '問い合わせ者のメールアドレスがありません。' }, { status: 422 })
      }

      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'メール送信が設定されていません（RESEND_API_KEY）。' },
          { status: 503 }
        )
      }

      const subject =
        subjectRaw ||
        `【返信】「${propertyTitle}」についてのお問い合わせ`

      const safeMessage = escapeHtml(message)
      const safeTitle = escapeHtml(propertyTitle)
      const safeAgentName = escapeHtml(agentDisplayName)
      const safeAgentEmail = escapeHtml(agentEmail)
      const safeInquirer = escapeHtml(inquirerName)
      const safeMailSubject = escapeHtml(subject)

      const from = getResendFromAddress()
      const resend = new Resend(apiKey)
      const { data: sent, error: sendErr } = await resend.emails.send({
        from,
        to: [to],
        ...(agentEmail ? { replyTo: agentEmail } : {}),
        subject,
        html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>${safeInquirer} 様</h2>
          <p>お問い合わせいただいた物件「<strong>${safeTitle}</strong>」について、担当より返信です。</p>
          <p style="font-size: 14px; color: #475569; margin: 16px 0;">
            <strong>担当:</strong> ${safeAgentName}
            ${agentEmail ? `<br><strong>連絡先メール:</strong> <a href="mailto:${encodeURIComponent(agentEmail)}" style="color: #2563eb;">${safeAgentEmail}</a>` : ''}
          </p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #666;">件名: ${safeMailSubject}</p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            ※送信元アドレスはお知らせ配信用です。<strong>「返信」で担当へ返信いただけます。</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Chonburi Home（管理画面から送信）</p>
        </div>
      `,
      })

      if (sendErr) {
        const msg = sendErr.message || String(sendErr)
        console.error('[admin/inquiries/reply] Resend', sendErr)
        let hint: string | undefined
        if (resendErrorNeedsVerifiedDomain(msg)) hint = RESEND_DOMAIN_HINT_JA
        else if (resendErrorInvalidFrom(msg)) hint = RESEND_FROM_FORMAT_HINT_JA
        return NextResponse.json({ error: msg, hint, sent: false }, { status: 502 })
      }
      resendId = sent?.id ?? null
    } else {
      const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
      if (!token) {
        return NextResponse.json(
          { error: 'LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN が未設定です。' },
          { status: 503 }
        )
      }
      const toUser = row.line_user_id!.trim()
      const pushResult = await lineOfficialPushText(toUser, message, token)
      if (!pushResult.ok) {
        const userMsg = linePushFailureUserMessage(pushResult.status, pushResult.body || '')
        console.error('[admin/inquiries/reply] LINE push', pushResult.status, pushResult.body)
        return NextResponse.json(
          {
            error: userMsg,
            line_status: pushResult.status,
            sent: false,
          },
          { status: 502 }
        )
      }
    }

    const replyMessage =
      channelRaw === 'email' && subjectRaw
        ? `【${subjectRaw}】\n\n${message}`
        : channelRaw === 'email' && !subjectRaw
          ? message
          : message

    const { data: insertedReply, error: replyErr } = await admin
      .from('inquiry_replies')
      .insert({
        inquiry_id: inquiryId,
        sender_id: user.id,
        message: replyMessage,
      })
      .select('id')
      .single()

    if (replyErr) {
      console.error('[admin/inquiries/reply] inquiry_replies insert', replyErr)
      return NextResponse.json(
        { error: '返信は送信されましたが、履歴の保存に失敗しました。', detail: replyErr.message },
        { status: 500 }
      )
    }

    const metadata: Record<string, unknown> = {
      sent_via: channelRaw,
      message_content: message,
      admin_sender_id: user.id,
      inquiry_reply_id: insertedReply?.id ?? null,
    }
    if (channelRaw === 'email') {
      metadata.email_subject = subjectRaw || `【返信】「${propertyTitle}」についてのお問い合わせ`
      if (resendId) metadata.resend_id = resendId
    }

    const { error: logErr } = await admin.from('inquiry_logs').insert({
      inquiry_id: inquiryId,
      property_id: row.property_id,
      agent_id: row.owner_id,
      user_id: null,
      inquiry_type: 'admin_reply',
      status: 'replied',
      metadata,
    })

    if (logErr) {
      console.error('[admin/inquiries/reply] inquiry_logs insert', logErr)
      return NextResponse.json(
        { error: '送信と返信履歴は保存されましたが、inquiry_logs への記録に失敗しました。', detail: logErr.message },
        { status: 500 }
      )
    }

    const { error: updErr } = await admin.from('inquiries').update({ is_read: true }).eq('id', inquiryId)

    if (updErr) {
      console.error('[admin/inquiries/reply] inquiries update', updErr)
    }

    return NextResponse.json({ success: true, sent: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[admin/inquiries/reply]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
