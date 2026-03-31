/**
 * 雛形: inquiries INSERT 後の通知振り分け（Database Webhook / pg_net 等から呼び出す想定）
 *
 * 本番の実装は Next.js の `src/app/api/webhooks/inquiry/route.ts` にあります。
 * Edge Function で同じ処理をしたい場合の流れのメモです。
 *
 * 環境変数例（Supabase Secrets）:
 * - RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
 * - LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN（inquirer への Push 用。公式 OA と同一チャネル）
 *
 * ペイロード例: { record: { id, property_id, preferred_reply_channel, line_user_id, ... } }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const preferred = record.preferred_reply_channel || 'email_only'
    const lineUid = (record.line_user_id || '').trim()

    // --- 1) 常にエージェントへメール（Resend 等）---
    // await fetch('https://api.resend.com/emails', { ... })

    // --- 2) preferred === 'email_and_line' かつ line_user_id あり → Messaging API Push（受付確認など）---
    if (preferred === 'email_and_line' && lineUid) {
      const token = Deno.env.get('LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN')?.trim()
      if (token) {
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: lineUid,
            messages: [
              {
                type: 'text',
                text: 'お問い合わせを受け付けました。担当よりご連絡します。',
              },
            ],
          }),
        })
        console.log('[inquiry-dispatch-template] LINE push status', pushRes.status)
      }
    }

    // --- 3) inquiry_logs に metadata で経路を残す（notifications.email_sent / line_push_ok 等）---
    // const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    // await admin.from('inquiry_logs').insert({ inquiry_type: 'form', metadata: { ... } })

    return new Response(
      JSON.stringify({
        ok: true,
        branch: preferred,
        line_push_skipped: preferred !== 'email_and_line' || !lineUid,
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
