import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * エージェントがダッシュボードから返信したあと、問い合わせ人へメール通知する。
 * （DB トリガー → Edge Function 経路は Authorization 不備で失敗しやすいため、ここで送信する）
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

        const body = (await req.json()) as { inquiry_id?: string; message?: string }
        const inquiryId = typeof body.inquiry_id === 'string' ? body.inquiry_id.trim() : ''
        const message = typeof body.message === 'string' ? body.message.trim() : ''

        if (!inquiryId || !message) {
            return NextResponse.json({ error: 'inquiry_id と message が必要です。' }, { status: 400 })
        }

        const { data: inquiry, error: inqError } = await supabase
            .from('inquiries')
            .select('id, owner_id, inquirer_email, inquirer_name, property:properties(title)')
            .eq('id', inquiryId)
            .single()

        if (inqError || !inquiry) {
            console.warn('[notify-reply] inquiry select:', inqError?.message)
            return NextResponse.json({ error: 'お問い合わせが見つかりません。' }, { status: 404 })
        }

        const isOwner = inquiry.owner_id === user.id
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
            console.warn('[notify-reply] forbidden', { userId: user.id, ownerId: inquiry.owner_id })
            return NextResponse.json({ error: 'このお問い合わせに返信する権限がありません。' }, { status: 403 })
        }

        const to = inquiry.inquirer_email?.trim()
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

        const propertyTitle =
            (inquiry as { property?: { title?: string } | null }).property?.title ?? '物件'
        const inquirerName = inquiry.inquirer_name?.trim() || 'お客様'
        const safeMessage = escapeHtml(message)
        const safeTitle = escapeHtml(propertyTitle)

        const from =
            process.env.RESEND_FROM?.trim() || 'Chonburi Home <onboarding@resend.dev>'

        const resend = new Resend(apiKey)
        const { data: sent, error: sendErr } = await resend.emails.send({
            from,
            to: [to],
            subject: `【返信】「${propertyTitle}」についてのお問い合わせ`,
            html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>${escapeHtml(inquirerName)} 様</h2>
          <p>お問い合わせいただいた物件「<strong>${safeTitle}</strong>」について、担当者より返信が届きました。</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin: 20px 0;">
            <p style="margin-top: 0; font-weight: bold; color: #666;">返信内容:</p>
            <p style="white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">※本メールはシステムによる自動送信です。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Chonburi Home</p>
        </div>
      `,
        })

        if (sendErr) {
            console.error('[notify-reply] Resend error:', sendErr)
            return NextResponse.json({ error: sendErr.message, sent: false }, { status: 502 })
        }

        return NextResponse.json({ success: true, sent: true, id: sent?.id })
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.error('[notify-reply]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
