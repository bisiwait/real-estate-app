import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getResendFromAddress } from '@/lib/resend-from'
import { getPublicSiteUrl } from '@/lib/site-url'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build')

export type AgentInquiryNotificationInput = {
  inquiryId: string
  propertyId: string
  propertyTitle: string
  agentUserId: string
  inquirerName: string
  inquirerEmail: string
  inquirerPhone?: string | null
  message: string
  preferredReplyChannel?: string | null
  lineUserId?: string | null
}

function normalizeReplyChannel(ch: string | null | undefined): 'email' | 'line' {
  if (ch === 'line' || ch === 'email_and_line') return 'line'
  return 'email'
}

function channelLabelJa(mode: 'email' | 'line'): string {
  return mode === 'line' ? 'LINEで返信を希望' : 'メールで返信を希望'
}

/** profiles.email → auth.users.email の順で掲載者の通知先を解決 */
export async function resolveAgentInquiryEmail(
  admin: SupabaseClient,
  agentUserId: string
): Promise<string | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', agentUserId)
    .maybeSingle()

  const fromProfile = (profile?.email as string | undefined)?.trim()
  if (fromProfile) return fromProfile

  const { data: authUser, error } = await admin.auth.admin.getUserById(agentUserId)
  if (error) {
    console.warn('[resolveAgentInquiryEmail] auth.admin.getUserById', error.message)
    return null
  }
  return authUser?.user?.email?.trim() || null
}

export type AgentInquiryNotificationResult =
  | { ok: true; resendId: string | null; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string }

/**
 * 新規 inquiries についてエージェントへ通知メールを送る（inquiry_logs で重複送信を防止）。
 */
export async function notifyAgentOfNewInquiry(
  admin: SupabaseClient,
  input: AgentInquiryNotificationInput
): Promise<AgentInquiryNotificationResult> {
  const { data: existingLog } = await admin
    .from('inquiry_logs')
    .select('id, metadata')
    .eq('inquiry_id', input.inquiryId)
    .eq('inquiry_type', 'form')
    .maybeSingle()

  const alreadySent =
    existingLog &&
    typeof existingLog.metadata === 'object' &&
    existingLog.metadata !== null &&
    (existingLog.metadata as { notifications?: { email_sent?: boolean } }).notifications
      ?.email_sent === true

  if (alreadySent) {
    return { ok: true, skipped: true, reason: 'already_notified' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not set' }
  }

  const agentEmail = await resolveAgentInquiryEmail(admin, input.agentUserId)
  if (!agentEmail) {
    return { ok: false, error: 'Agent notification email not found' }
  }

  const replyMethod = normalizeReplyChannel(input.preferredReplyChannel)
  const lineUid = (input.lineUserId || '').trim() || null
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
    subject: `【新着】物件「${input.propertyTitle}」にお問い合わせがありました`,
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">新着お問い合わせ通知</h2>
          <p style="font-size: 16px; color: #475569;">以下の物件に対して新しいお問い合わせがありました：</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>物件名:</strong> ${input.propertyTitle}</p>
            <p style="margin: 5px 0;"><strong>物件ID:</strong> ${input.propertyId}</p>
          </div>
          <h3 style="color: #1e293b; font-size: 18px; margin-top: 30px;">お問い合わせ内容</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; width: 120px; color: #64748b;">お名前</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${input.inquirerName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">メールアドレス</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${input.inquirerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">電話番号</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${input.inquirerPhone || 'なし'}</td>
            </tr>
            ${channelRow}
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-style: italic; color: #1e293b;">
            "${input.message}"
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
    console.error('[notifyAgentOfNewInquiry] Resend', error)
    return { ok: false, error: error.message || String(error) }
  }

  const notificationsMeta = {
    email_sent: true,
    resend_email_id: data?.id ?? null,
  }

  const { error: logErr } = await admin.from('inquiry_logs').insert({
    property_id: input.propertyId,
    agent_id: input.agentUserId,
    inquiry_id: input.inquiryId,
    inquiry_type: 'form',
    user_id: null,
    status: 'new',
    metadata: {
      source: 'web_form',
      inquiry_id: input.inquiryId,
      reply_method: replyMethod,
      preferred_reply_channel: replyMethod,
      line_user_id: lineUid,
      notifications: notificationsMeta,
    },
  })

  if (logErr) {
    console.error('[notifyAgentOfNewInquiry] inquiry_logs insert', logErr)
  }

  return { ok: true, resendId: data?.id ?? null }
}
