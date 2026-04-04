import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
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
import { isPremiumActive } from '@/lib/utils/plan'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** anon キーを SERVICE_ROLE に誤設定すると RLS が効き inquiries が常に 0 件になる */
function isLikelyServiceRoleKey(key: string | undefined): boolean {
  const k = key?.trim()
  if (!k) return false
  try {
    const parts = k.split('.')
    if (parts.length < 2) return false
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as { role?: string }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type InquiryNotifyRow = {
  id: string
  owner_id: string
  property_id: string | null
  inquirer_email: string | null
  inquirer_name: string | null
  preferred_reply_channel: string | null
  line_user_id: string | null
  first_reply_sent?: boolean | null
}

/** 成功したエージェント返信の LINE Push が既に記録されているか（失敗時はログが残らないため再送可） */
async function hasSuccessfulAgentLinePush(admin: Awaited<ReturnType<typeof createAdminClient>>, inquiryId: string) {
  const { data, error } = await admin
    .from('inquiry_logs')
    .select('metadata')
    .eq('inquiry_id', inquiryId)
    .eq('inquiry_type', 'agent_reply')
    .limit(30)
  if (error || !data?.length) return false
  return data.some((row) => {
    const m = row.metadata as Record<string, unknown> | null
    return m?.sent_via === 'line'
  })
}

async function insertAgentDeliveryLog(params: {
  inquiryId: string
  propertyId: string | null
  agentId: string
  senderUserId: string
  message: string
  sentVia: 'email' | 'line'
  inquiryReplyId: string | null
  forcedEmail: boolean
  resendId: string | null
  linePushStatus: number | null
}) {
  try {
    const admin = await createAdminClient()
    const metadata: Record<string, unknown> = {
      sent_via: params.sentVia,
      message_content: params.message,
      sender_user_id: params.senderUserId,
      delivery_route: 'agent_dashboard_notify_reply',
    }
    if (params.inquiryReplyId) metadata.inquiry_reply_id = params.inquiryReplyId
    if (params.forcedEmail) metadata.forced_email = true
    if (params.resendId) metadata.resend_id = params.resendId
    if (params.linePushStatus != null) metadata.line_push_http_status = params.linePushStatus

    const { error } = await admin.from('inquiry_logs').insert({
      inquiry_id: params.inquiryId,
      property_id: params.propertyId ?? null,
      agent_id: params.agentId,
      user_id: null,
      inquiry_type: 'agent_reply',
      status: 'replied',
      metadata,
    })
    if (error) {
      console.error('[notify-reply] inquiry_logs insert', error)
    }
  } catch (e) {
    console.error('[notify-reply] inquiry_logs insert exception', e)
  }
}

/**
 * エージェントがダッシュボードから返信したあと、問い合わせ人へ届ける。
 * preferred_reply_channel が line かつ line_user_id がある場合は LINE Push、それ以外はメール（Resend）。
 * LINE 希望だが line_user_id がない場合は force_email でメールにフォールバック可能。
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
    }

    const body = (await req.json()) as {
      inquiry_id?: string
      message?: string
      inquiry_reply_id?: string
      force_email?: boolean
    }
    const inquiryId = typeof body.inquiry_id === 'string' ? body.inquiry_id.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const forceEmail = body.force_email === true
    const inquiryReplyId =
      typeof body.inquiry_reply_id === 'string' && UUID_RE.test(body.inquiry_reply_id.trim())
        ? body.inquiry_reply_id.trim()
        : null

    if (!inquiryId || !message) {
      return NextResponse.json({ error: 'inquiry_id と message が必要です。' }, { status: 400 })
    }
    if (!UUID_RE.test(inquiryId)) {
      return NextResponse.json({ error: '無効な inquiry_id です。' }, { status: 400 })
    }
    if (message.length > 4500) {
      return NextResponse.json({ error: '本文が長すぎます（4500文字以内）。' }, { status: 400 })
    }

    // 1) service_role が正しいときは管理クライアントで取得（埋め込み RLS 問題も回避）
    // 2) SUPABASE_SERVICE_ROLE_KEY が未設定・anon 誤設定だと「管理クライアント」が実質 anon になり
    //    inquiries が常に 0 件 → 404。ダッシュボードはブラウザのユーザー JWT で見えているため齟齬が出る。
    // 3) その場合はログインセッション付き supabase で同じ id を取得する。
    const adminKeyOk = isLikelyServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
    let admin: Awaited<ReturnType<typeof createAdminClient>> | null = null
    let inquiry: Record<string, unknown> | null = null

    if (adminKeyOk) {
      admin = await createAdminClient()
      const { data, error } = await admin.from('inquiries').select('*').eq('id', inquiryId).maybeSingle()
      if (error) console.warn('[notify-reply] admin inquiries:', error.message, error.code)
      if (data) inquiry = data as Record<string, unknown>
    } else {
      console.warn(
        '[notify-reply] SUPABASE_SERVICE_ROLE_KEY missing or not service_role JWT; falling back to session client for inquiries'
      )
    }

    if (!inquiry) {
      const { data, error } = await supabase.from('inquiries').select('*').eq('id', inquiryId).maybeSingle()
      if (error) console.warn('[notify-reply] session inquiries:', error.message, error.code)
      if (data) inquiry = data as Record<string, unknown>
    }

    if (!inquiry) {
      return NextResponse.json(
        { error: 'お問い合わせが見つかりません。', code: 'INQUIRY_NOT_FOUND' },
        { status: 404 }
      )
    }

    const row = inquiry as unknown as InquiryNotifyRow
    const isOwner = row.owner_id === user.id
    let isAdminUser = false
    if (!isOwner) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_admin, user_role')
        .eq('id', user.id)
        .maybeSingle()
      isAdminUser = prof?.is_admin === true || prof?.user_role === 'admin'
    }

    if (!isOwner && !isAdminUser) {
      console.warn('[notify-reply] forbidden', { userId: user.id, ownerId: row.owner_id })
      return NextResponse.json({ error: 'このお問い合わせに返信する権限がありません。' }, { status: 403 })
    }

    let propertyTitle = '物件'
    if (row.property_id) {
      const { data: propUser } = await supabase
        .from('properties')
        .select('title')
        .eq('id', row.property_id)
        .maybeSingle()
      if (propUser?.title?.trim()) propertyTitle = propUser.title.trim()
      else if (admin) {
        const { data: propAdmin } = await admin
          .from('properties')
          .select('title')
          .eq('id', row.property_id)
          .maybeSingle()
        if (propAdmin?.title?.trim()) propertyTitle = propAdmin.title.trim()
      }
    }

    const preferred = normalizeInquiryReplyChannel(row.preferred_reply_channel)
    const lineUid = row.line_user_id?.trim() || ''
    let useLine = preferred === 'line' && !forceEmail && Boolean(lineUid)

    if (preferred === 'line' && !forceEmail && !lineUid) {
      return NextResponse.json(
        {
          error:
            'お客様は LINE 返信を希望されていますが、LINE ユーザーIDが記録されていません。メールでの返信をご利用ください。',
          code: 'LINE_USER_ID_MISSING',
          can_use_email_fallback: true,
        },
        { status: 422 }
      )
    }

    if (preferred === 'line' && !forceEmail && lineUid) {
      const flagged = row.first_reply_sent === true
      const alreadyPushed =
        flagged || (admin ? await hasSuccessfulAgentLinePush(admin, inquiryId) : false)
      if (alreadyPushed) {
        return NextResponse.json(
          {
            error:
              'このお問い合わせには既に公式 LINE から Push を送信済みです。続きのやり取りは LINE Official Account Manager（チャット）から、同じ友だち宛に返信してください。',
            code: 'LINE_PUSH_ALREADY_SENT',
            can_use_email_fallback: true,
          },
          { status: 409 }
        )
      }
    }

    const inquirerName = row.inquirer_name?.trim() || 'お客様'

    const { data: agentProfile } = await supabase
      .from('profiles')
      .select('email, full_name, plan, plan_type, current_period_end, is_admin')
      .eq('id', user.id)
      .maybeSingle()

    const agentEmail = agentProfile?.email?.trim() || user.email?.trim() || ''
    const agentDisplayName = agentProfile?.full_name?.trim() || '担当エージェント'

    if (useLine && !isPremiumActive(agentProfile)) {
      useLine = false
    }

    if (useLine) {
      const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
      if (!token) {
        return NextResponse.json(
          { error: 'LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN が未設定のため LINE で送信できません。' },
          { status: 503 }
        )
      }
      const pushResult = await lineOfficialPushText(lineUid, message, token)
      if (!pushResult.ok) {
        const userMsg = linePushFailureUserMessage(pushResult.status, pushResult.body || '')
        console.error('[notify-reply] LINE push', pushResult.status, pushResult.body)
        return NextResponse.json(
          {
            error: userMsg,
            line_status: pushResult.status,
            sent: false,
            sent_via: 'line',
          },
          { status: 502 }
        )
      }

      await insertAgentDeliveryLog({
        inquiryId,
        propertyId: row.property_id,
        agentId: row.owner_id,
        senderUserId: user.id,
        message,
        sentVia: 'line',
        inquiryReplyId,
        forcedEmail: false,
        resendId: null,
        linePushStatus: pushResult.status,
      })

      const clientForFr = isOwner ? supabase : admin ?? supabase
      const { error: frErr } = await clientForFr
        .from('inquiries')
        .update({ first_reply_sent: true })
        .eq('id', inquiryId)
      if (frErr) {
        console.warn('[notify-reply] first_reply_sent update', frErr.message)
      }

      return NextResponse.json({
        success: true,
        sent: true,
        sent_via: 'line',
      })
    }

    const to = row.inquirer_email?.trim()
    if (!to) {
      return NextResponse.json({ error: '問い合わせ人のメールアドレスがありません。' }, { status: 422 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[notify-reply] RESEND_API_KEY is not set')
      return NextResponse.json(
        { error: 'メール送信が設定されていません（RESEND_API_KEY）。', sent: false },
        { status: 503 }
      )
    }

    const safeMessage = escapeHtml(message)
    const safeTitle = escapeHtml(propertyTitle)
    const safeAgentName = escapeHtml(agentDisplayName)
    const safeAgentEmail = escapeHtml(agentEmail)
    const safeInquirer = escapeHtml(inquirerName)

    const from = getResendFromAddress()
    const resend = new Resend(apiKey)
    const { data: sent, error: sendErr } = await resend.emails.send({
      from,
      to: [to],
      ...(agentEmail ? { replyTo: agentEmail } : {}),
      subject: `【返信】「${propertyTitle}」についてのお問い合わせ`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>${safeInquirer} 様</h2>
          <p>お問い合わせいただいた物件「<strong>${safeTitle}</strong>」について、担当より返信です。</p>
          <p style="font-size: 14px; color: #475569; margin: 16px 0;">
            <strong>担当:</strong> ${safeAgentName}
            ${agentEmail ? `<br><strong>連絡先メール:</strong> <a href="mailto:${encodeURIComponent(agentEmail)}" style="color: #2563eb;">${safeAgentEmail}</a>` : ''}
          </p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #666;">返信内容:</p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            ※送信元アドレスはお知らせ配信用です。<strong>「返信」ボタンでお返事いただくと、担当（${safeAgentName}）のメールアドレス宛に届きます。</strong>直接ご連絡いただくこともできます。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Chonburi Home</p>
        </div>
      `,
    })

    if (sendErr) {
      const msg = sendErr.message || String(sendErr)
      console.error('[notify-reply] Resend error:', sendErr, 'from=', from)
      let hint: string | undefined
      if (resendErrorNeedsVerifiedDomain(msg)) hint = RESEND_DOMAIN_HINT_JA
      else if (resendErrorInvalidFrom(msg)) hint = RESEND_FROM_FORMAT_HINT_JA
      return NextResponse.json({ error: msg, hint, sent: false, sent_via: 'email' }, { status: 502 })
    }

    await insertAgentDeliveryLog({
      inquiryId,
      propertyId: row.property_id,
      agentId: row.owner_id,
      senderUserId: user.id,
      message,
      sentVia: 'email',
      inquiryReplyId,
      forcedEmail:
        preferred === 'line' && (forceEmail || !isPremiumActive(agentProfile)),
      resendId: sent?.id ?? null,
      linePushStatus: null,
    })

    return NextResponse.json({
      success: true,
      sent: true,
      sent_via: 'email',
      id: sent?.id,
      used_email_fallback: preferred === 'line' && (forceEmail || !isPremiumActive(agentProfile)),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[notify-reply]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
