import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractBearerToken(req: Request): string | null {
    const raw = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!raw) return null
    const m = raw.match(/^Bearer\s+(.+)$/i)
    return m?.[1]?.trim() ?? null
}

function authorizeSend(token: string | null): boolean {
    if (!token) return false
    const secret = process.env.WHATSAPP_SEND_API_SECRET?.trim()
    if (secret && token === secret) return true
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (svc && token === svc) return true
    return false
}

type SendBody =
    | { agentId?: string; toNumber?: string; message?: string }

export async function POST(req: Request) {
    try {
        if (!authorizeSend(extractBearerToken(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let bodyJson: SendBody
        try {
            bodyJson = (await req.json()) as SendBody
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const message =
            typeof bodyJson.message === 'string' ? bodyJson.message.trim() : ''
        if (!message) {
            return NextResponse.json({ error: 'message が必要です' }, { status: 400 })
        }

        let toRecipient: string

        const agentId = typeof bodyJson.agentId === 'string' ? bodyJson.agentId.trim() : ''
        const toNumber = typeof bodyJson.toNumber === 'string' ? bodyJson.toNumber.trim() : ''

        if (toNumber && agentId) {
            return NextResponse.json(
                { error: 'agentId と toNumber は同時に指定できません' },
                { status: 400 }
            )
        }

        if (!toNumber && !agentId) {
            return NextResponse.json(
                { error: 'agentId または toNumber のどちらかが必要です' },
                { status: 400 }
            )
        }

        if (toNumber) {
            toRecipient = toNumber
        } else {
            if (!UUID_RE.test(agentId)) {
                return NextResponse.json({ error: '無効な agentId です' }, { status: 400 })
            }
            const admin = await createAdminClient()
            const { data: row, error } = await admin
                .from('profiles')
                .select('phone, deleted_at, status')
                .eq('id', agentId)
                .maybeSingle()

            if (error) {
                console.error('[whatsapp/send] profile fetch:', error.message)
                return NextResponse.json(
                    { error: 'プロフィールの取得に失敗しました' },
                    { status: 500 }
                )
            }
            if (!row?.phone?.trim()) {
                return NextResponse.json(
                    { error: 'エージェントに登録済みの電話番号がありません' },
                    { status: 422 }
                )
            }
            if (row.deleted_at != null || row.status === 'suspended') {
                return NextResponse.json(
                    { error: '送信対象のエージェントは利用できません' },
                    { status: 403 }
                )
            }
            toRecipient = row.phone.trim()
        }

        const result = await sendWhatsAppMessage(toRecipient, message)
        return NextResponse.json({
            ok: true,
            sid: result.sid,
            twilioStatus: result.status ?? null,
        })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)

        console.error('[whatsapp/send] Twilio failure:', err)

        const twilioExtras: Record<string, string | number | null> = {}

        const anyErr = err as {
            status?: number
            code?: string | number
            moreInfo?: string
        }
        if (typeof anyErr?.status === 'number') twilioExtras.twilio_http_status = anyErr.status
        if (anyErr?.code != null) twilioExtras.twilio_code = Number(anyErr.code) || String(anyErr.code)
        if (typeof anyErr?.moreInfo === 'string') twilioExtras.twilio_more_info = anyErr.moreInfo

        return NextResponse.json(
            {
                error: msg,
                details: twilioExtras,
            },
            { status: 500 }
        )
    }
}
