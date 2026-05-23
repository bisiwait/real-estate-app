import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

/** Supabase Database Webhooks が送る標準ペイロードに近い形 */
type DbWebhookPayload = {
    type?: string
    table?: string
    schema?: string
    record?: Record<string, unknown> | null
    old_record?: Record<string, unknown> | null
}

function extractBearer(req: Request): string | null {
    const raw = req.headers.get('authorization') ?? req.headers.get('Authorization')
    if (!raw) return null
    const m = raw.match(/^Bearer\s+(.+)/i)
    return m?.[1]?.trim() ?? null
}

function authorizeWebhook(token: string | null): boolean {
    const expected = process.env.WHATSAPP_WEBHOOK_SECRET?.trim()
    if (!expected) return false
    return Boolean(token && token === expected)
}

function stringifyMeta(value: unknown): string {
    if (value === null || value === undefined) return ''
    return String(value)
}

async function notifyAgentByPhone(
    phone: string,
    text: string
): Promise<{ ok: boolean; error?: string }> {
    try {
        await sendWhatsAppMessage(phone, text)
        return { ok: true }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: msg }
    }
}

function areaMatchesAgentTarget(areaLabel: string, targetAreaRaw: string | null | undefined): boolean {
    const target = (targetAreaRaw ?? '').trim().toLowerCase()
    if (!target.length) return false
    const label = areaLabel.trim().toLowerCase()
    if (!label.length) return false
    if (target.includes(label) || label.includes(target)) return true

    const parts = ['pattaya', 'ศรีราชา', 'sriracha', 'north', 'central', 'east', 'jom', 'พัทยา']
    const labelTokens = parts.filter((t) => label.includes(t))
    return labelTokens.some((t) => target.includes(t))
}

/**
 * Database Webhooks から叩かれるエンドポイント。
 *
 * Dashboard → Database → Webhooks で `properties` の INSERT / UPDATE を登録し、
 * Headers に `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>` を付与する。
 *
 * INSERT: 所有者エージェントへ「新規物件」を通知。
 * UPDATE: draft → published に変わったタイミングで「公開」を通知。
 * 環境変数 WHATSAPP_NOTIFY_MATCHING_AGENTS=true のときのみ、対象エリアに近い他エージェントへ簡易マッチング通知。
 */
export async function POST(req: Request) {
    try {
        if (!authorizeWebhook(extractBearer(req))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = (await req.json()) as DbWebhookPayload
        console.log('[whatsapp-supabase webhook] incoming', {
            type: payload.type,
            table: payload.table,
            schema: payload.schema,
            hasRecord: Boolean(payload.record),
        })

        if (payload.table !== 'properties' || !payload.record) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'not_properties_or_no_record' })
        }

        const type = payload.type ?? ''
        const rec = payload.record
        const old = payload.old_record ?? null

        const title = stringifyMeta(rec.title) || '(無題)'
        const userId = stringifyMeta(rec.user_id)
        if (!userId) {
            return NextResponse.json({ ok: false, skipped: true, reason: 'no_user_id' })
        }

        const notifyOwnerOnInsert = type === 'INSERT'
        const notifyOwnerOnPublish =
            type === 'UPDATE' &&
            stringifyMeta(old?.status) !== 'published' &&
            stringifyMeta(rec.status) === 'published'

        if (!notifyOwnerOnInsert && !notifyOwnerOnPublish) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'event_not_notified' })
        }

        const admin = await createAdminClient()

        const { data: agent, error: profErr } = await admin
            .from('profiles')
            .select('id, phone, full_name, deleted_at, status')
            .eq('id', userId)
            .maybeSingle()

        if (profErr) {
            console.error('[whatsapp-supabase]: profile fetch', profErr.message)
            return NextResponse.json({ error: 'profile_fetch_failed' }, { status: 500 })
        }

        const notifications: Record<string, string> = {}

        if (agent?.phone?.trim() && agent.deleted_at == null && agent.status !== 'suspended') {
            const label =
                notifyOwnerOnInsert && !notifyOwnerOnPublish ? '一覧に物件が作成されました' : '物件が公開されました'
            const body = `[Chonburi Home]\n${label}\nタイトル: ${title}\nダッシュボードで確認してください。`
            const r = await notifyAgentByPhone(agent.phone.trim(), body)
            notifications.owner = r.ok ? 'sent' : `failed: ${r.error ?? '?'}`
        } else {
            notifications.owner = 'skipped_no_phone_or_inactive_agent'
        }

        const notifyMatching =
            process.env.WHATSAPP_NOTIFY_MATCHING_AGENTS?.trim()?.toLowerCase() === 'true'
        let matchingSent = 0

        if (notifyMatching && rec.area_id) {
            const areaId = stringifyMeta(rec.area_id)
            const { data: areaRow } = await admin
                .from('areas')
                .select('name, region:regions(name)')
                .eq('id', areaId)
                .maybeSingle()

            const areaLabel = stringifyMeta(areaRow?.name ?? '')
            const regionNameObj = (areaRow as { region?: { name?: string } | null } | null)?.region
            const regionLabel = stringifyMeta(regionNameObj?.name ?? '')

            const { data: others, error: oErr } = await admin
                .from('profiles')
                .select('id, phone, target_area')
                .eq('user_role', 'agent')
                .is('deleted_at', null)
                .not('phone', 'is', null)
                .or('status.is.null,status.neq.suspended')

            if (oErr) {
                console.error('[whatsapp-supabase] matching profiles', oErr.message)
            } else {
                const combinedLabel = `${areaLabel} ${regionLabel}`.trim()
                const shortMsg = `[Chonburi Home]\nエリア注目: 「${combinedLabel || '—'}」に新しい物件があります\n${title}`
                for (const row of others ?? []) {
                    if (!row.phone?.trim() || row.id === userId) continue
                    if (!areaMatchesAgentTarget(combinedLabel, row.target_area)) continue

                    const r = await notifyAgentByPhone(row.phone.trim(), shortMsg)
                    if (r.ok) matchingSent += 1
                }
            }
        }

        console.log('[whatsapp-supabase] done', { notifications, matchingSent })

        return NextResponse.json({
            ok: true,
            notifications,
            matchingSent,
        })
    } catch (err: unknown) {
        console.error('[whatsapp-supabase webhook] error', err)
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json(
            {
                error: msg,
                details: err instanceof Error ? { stack: err.stack ?? null } : null,
            },
            { status: 500 }
        )
    }
}
