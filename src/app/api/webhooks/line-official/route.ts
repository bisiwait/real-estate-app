import { createAdminClient } from '@/lib/supabase/server'
import {
  lineOfficialReplyMessage,
  verifyLineChannelSignature,
} from '@/lib/line-official-signature'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NONCE_REGEX = /\b([A-Fa-f0-9]{10})\b/

function officialEnabled() {
  return Boolean(
    process.env.LINE_OFFICIAL_CHANNEL_SECRET?.trim() &&
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
  )
}

/** LINE Webhook は raw body で署名するため text() のみ使用 */
export async function POST(req: Request) {
  if (!officialEnabled()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  const raw = await req.text()
  const secret = process.env.LINE_OFFICIAL_CHANNEL_SECRET!.trim()
  const sig = req.headers.get('x-line-signature')
  if (!verifyLineChannelSignature(raw, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { events?: unknown[] }
  try {
    body = JSON.parse(raw) as { events?: unknown[] }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN!.trim()
  const admin = await createAdminClient()

  const events = Array.isArray(body.events) ? body.events : []

  for (const ev of events) {
    const e = ev as {
      type?: string
      replyToken?: string
      source?: { userId?: string; type?: string }
      message?: { type?: string; text?: string }
    }

    if (e.type === 'follow' && e.replyToken) {
      const welcome =
        process.env.LINE_OFFICIAL_WEBHOOK_FOLLOW_MESSAGE?.trim() ||
        '友だち追加ありがとうございます。\n物件ページからお問い合わせの方は、画面に表示された10桁のコード（英数字）をこのトークに送信してください。'
      await lineOfficialReplyMessage(e.replyToken, [{ type: 'text', text: welcome }], token)
      continue
    }

    if (e.type === 'message' && e.message?.type === 'text' && e.replyToken && e.source?.userId) {
      const text = e.message.text || ''
      const m = text.match(NONCE_REGEX)
      const nonce = m?.[1]?.toUpperCase()
      if (!nonce) {
        const hint =
          process.env.LINE_OFFICIAL_WEBHOOK_UNKNOWN_MESSAGE?.trim() ||
          'お問い合わせコードが見つかりませんでした。物件ページの「LINEで問い合わせ」から表示される10桁のコードを送信してください。'
        await lineOfficialReplyMessage(e.replyToken, [{ type: 'text', text: hint }], token)
        continue
      }

      const { data: intent, error: findErr } = await admin
        .from('line_official_inquiry_intents')
        .select('id, inquiry_log_id, status, expires_at')
        .eq('nonce', nonce)
        .eq('status', 'pending')
        .maybeSingle()

      if (findErr || !intent) {
        await lineOfficialReplyMessage(
          e.replyToken,
          [
            {
              type: 'text',
              text:
                process.env.LINE_OFFICIAL_WEBHOOK_BAD_NONCE?.trim() ||
                'このコードは見つからないか、有効期限が切れています。物件ページから再度お試しください。',
            },
          ],
          token
        )
        continue
      }

      if (new Date(intent.expires_at).getTime() < Date.now()) {
        await admin
          .from('line_official_inquiry_intents')
          .update({ status: 'expired' })
          .eq('id', intent.id)
        await lineOfficialReplyMessage(
          e.replyToken,
          [
            {
              type: 'text',
              text:
                process.env.LINE_OFFICIAL_WEBHOOK_EXPIRED_NONCE?.trim() ||
                'このコードの有効期限が切れています。物件ページから再度お問い合わせください。',
            },
          ],
          token
        )
        continue
      }

      const { error: upErr } = await admin
        .from('line_official_inquiry_intents')
        .update({
          line_user_id: e.source.userId,
          status: 'bound',
          metadata: { bound_at: new Date().toISOString() },
        })
        .eq('id', intent.id)
        .eq('status', 'pending')

      if (upErr) {
        console.error('[line-official-webhook] intent update', upErr)
        await lineOfficialReplyMessage(
          e.replyToken,
          [{ type: 'text', text: '処理中にエラーが発生しました。しばらくしてから再度お試しください。' }],
          token
        )
        continue
      }

      if (intent.inquiry_log_id) {
        const { data: logRow } = await admin
          .from('inquiry_logs')
          .select('metadata')
          .eq('id', intent.inquiry_log_id)
          .maybeSingle()
        const meta = (logRow?.metadata as Record<string, unknown> | null) || {}
        await admin
          .from('inquiry_logs')
          .update({
            metadata: {
              ...meta,
              line_official_user_id: e.source.userId,
              line_official_bound_at: new Date().toISOString(),
            },
          })
          .eq('id', intent.inquiry_log_id)
      }

      const okMsg =
        process.env.LINE_OFFICIAL_WEBHOOK_BOUND_OK?.trim() ||
        '受け付けました。担当より公式LINEにてご連絡します。少々お待ちください。'
      await lineOfficialReplyMessage(e.replyToken, [{ type: 'text', text: okMsg }], token)
    }
  }

  return NextResponse.json({ ok: true })
}

/** 開発時の疎通確認用（本番では LINE が POST のみ使用） */
export async function GET() {
  return NextResponse.json({
    service: 'line-official-webhook',
    configured: officialEnabled(),
  })
}
