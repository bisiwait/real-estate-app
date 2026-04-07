/**
 * 雛形: inquiries INSERT 後の通知振り分け（Database Webhook / pg_net 等から呼び出す想定）
 *
 * 本番の実装は Next.js の `src/app/api/webhooks/inquiry/route.ts` にあります。
 *
 * Messaging API / LINE Push は廃止。メール通知のみを想定します。
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

    // 1) エージェントへメール（常に）— Resend 等は別途実装
    // 2) inquiry_logs: metadata: { reply_method: replyMethod, ... }

    return new Response(
      JSON.stringify({
        ok: true,
        reply_method: replyMethod,
        note: 'LINE Push removed; use Next.js webhook for email delivery.',
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
