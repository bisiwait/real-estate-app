/**
 * 雛形: inquiries INSERT 後の通知振り分け（Database Webhook / pg_net 等から呼び出す想定）
 *
 * 本番の実装は Next.js の `src/app/api/webhooks/inquiry/route.ts` にあります。
 *
 * 分岐:
 * - 常にエージェントへメール（Resend）
 * - preferred_reply_channel === 'line' かつ line_user_id あり → 問い合わせ主へ Push（お礼文）
 * - 'email' のときは Push しない
 *
 * inquiry_logs.metadata に reply_method: 'email' | 'line' を残すと管理画面で判別しやすいです。
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeReplyChannel(ch: string | null | undefined): 'email' | 'line' {
  if (ch === 'line' || ch === 'email_and_line') return 'line'
  return 'email'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const record = body.record as {
      preferred_reply_channel?: string
      line_user_id?: string | null
      property_id?: string
      id?: string
    }

    const replyMethod = normalizeReplyChannel(record.preferred_reply_channel)
    const lineUid = (record.line_user_id || '').trim()

    // 1) エージェントへメール（常に）
    // await fetch('https://api.resend.com/emails', { ... })

    // 2) LINE 返信希望かつ userId あり → Push
    if (replyMethod === 'line' && lineUid) {
      const token = Deno.env.get('LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN')?.trim()
      if (token) {
        const text =
          Deno.env.get('LINE_INQUIRY_THANK_YOU_MESSAGE')?.trim() ||
          'お問い合わせありがとうございます。担当よりご連絡いたします。'
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: lineUid,
            messages: [{ type: 'text', text }],
          }),
        })
        console.log('[inquiry-dispatch-template] LINE push status', pushRes.status)
      }
    }

    // 3) inquiry_logs: metadata: { reply_method: replyMethod, ... }

    return new Response(
      JSON.stringify({
        ok: true,
        reply_method: replyMethod,
        line_push_skipped: replyMethod !== 'line' || !lineUid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
