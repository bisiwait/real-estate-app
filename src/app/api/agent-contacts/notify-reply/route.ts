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
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

type ContactRow = {
    id: string
    agent_id: string
    customer_name: string | null
    customer_email: string | null
}

/**
 * エージェントがプロフィール問い合わせに返信したあと、問い合わせ人へメール（Resend）で届ける。
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
            agent_contact_id?: string
            message?: string
        }
        const contactId =
            typeof body.agent_contact_id === 'string' ? body.agent_contact_id.trim() : ''
        const message = typeof body.message === 'string' ? body.message.trim() : ''

        if (!contactId || !message) {
            return NextResponse.json({ error: 'agent_contact_id と message が必要です。' }, { status: 400 })
        }
        if (!UUID_RE.test(contactId)) {
            return NextResponse.json({ error: '無効な agent_contact_id です。' }, { status: 400 })
        }
        if (message.length > 4500) {
            return NextResponse.json({ error: '本文が長すぎます（4500文字以内）。' }, { status: 400 })
        }

        let adminKeyOk = false
        try {
            const { serviceRoleKey } = getSupabaseServiceRoleConfig(hostHeaderFromRequest(req))
            adminKeyOk = isLikelyServiceRoleKey(serviceRoleKey)
        } catch {
            adminKeyOk = false
        }

        let row: ContactRow | null = null

        if (adminKeyOk) {
            const admin = await createAdminClient()
            const { data, error } = await admin
                .from('agent_contacts')
                .select('id, agent_id, customer_name, customer_email')
                .eq('id', contactId)
                .maybeSingle()
            if (error) console.warn('[agent-contacts/notify-reply] admin select:', error.message)
            if (data) row = data as ContactRow
        }

        if (!row) {
            const { data, error } = await supabase
                .from('agent_contacts')
                .select('id, agent_id, customer_name, customer_email')
                .eq('id', contactId)
                .maybeSingle()
            if (error) console.warn('[agent-contacts/notify-reply] session select:', error.message)
            if (data) row = data as ContactRow
        }

        if (!row) {
            return NextResponse.json(
                { error: 'お問い合わせが見つかりません。', code: 'CONTACT_NOT_FOUND' },
                { status: 404 }
            )
        }

        if (row.agent_id !== user.id) {
            const { data: prof } = await supabase
                .from('profiles')
                .select('is_admin, user_role')
                .eq('id', user.id)
                .maybeSingle()
            const isAdminUser = prof?.is_admin === true || prof?.user_role === 'admin'
            if (!isAdminUser) {
                return NextResponse.json({ error: 'このお問い合わせに返信する権限がありません。' }, { status: 403 })
            }
        }

        const { data: agentProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', row.agent_id)
            .maybeSingle()

        const agentEmail = agentProfile?.email?.trim() || user.email?.trim() || ''
        const agentDisplayName = agentProfile?.full_name?.trim() || '担当エージェント'

        const to = row.customer_email?.trim()
        if (!to) {
            return NextResponse.json({ error: '問い合わせ人のメールアドレスがありません。' }, { status: 422 })
        }

        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) {
            console.error('[agent-contacts/notify-reply] RESEND_API_KEY is not set')
            return NextResponse.json(
                { error: 'メール送信が設定されていません（RESEND_API_KEY）。', sent: false },
                { status: 503 }
            )
        }

        const customerName = row.customer_name?.trim() || 'お客様'
        const safeMessage = escapeHtml(message)
        const safeAgentName = escapeHtml(agentDisplayName)
        const safeAgentEmail = escapeHtml(agentEmail)
        const safeCustomer = escapeHtml(customerName)

        const from = getResendFromAddress()
        const resend = new Resend(apiKey)
        const { data: sent, error: sendErr } = await resend.emails.send({
            from,
            to: [to],
            ...(agentEmail ? { replyTo: agentEmail } : {}),
            subject: `【返信】エージェントプロフィールへのお問い合わせ`,
            html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>${safeCustomer} 様</h2>
          <p>エージェント公開ページからのお問い合わせについて、担当より返信です。</p>
          <p style="font-size: 14px; color: #475569; margin: 16px 0;">
            <strong>担当:</strong> ${safeAgentName}
            ${agentEmail ? `<br><strong>連絡先メール:</strong> <a href="mailto:${encodeURIComponent(agentEmail)}" style="color: #2563eb;">${safeAgentEmail}</a>` : ''}
          </p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #666;">返信内容:</p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            ※送信元アドレスはお知らせ配信用です。<strong>「返信」で担当（${safeAgentName}）のメールアドレス宛に届きます。</strong>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Chonburi Home</p>
        </div>
      `,
        })

        if (sendErr) {
            const msg = sendErr.message || String(sendErr)
            console.error('[agent-contacts/notify-reply] Resend error:', sendErr, 'from=', from)
            let hint: string | undefined
            if (resendErrorNeedsVerifiedDomain(msg)) hint = RESEND_DOMAIN_HINT_JA
            else if (resendErrorInvalidFrom(msg)) hint = RESEND_FROM_FORMAT_HINT_JA
            return NextResponse.json({ error: msg, hint, sent: false, sent_via: 'email' }, { status: 502 })
        }

        return NextResponse.json({
            success: true,
            sent: true,
            sent_via: 'email',
            id: sent?.id,
        })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.error('[agent-contacts/notify-reply]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
