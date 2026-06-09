import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: ブロードキャスト配信を登録し Edge Function を起動 */
export async function POST(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const body = (await request.json().catch(() => ({}))) as {
            property_ids?: string[]
            title?: string
            content?: string
            segment_type?: string
            segment_value?: string
        }

        const propertyIds = body.property_ids ?? []
        const title = body.title?.trim() ?? ''
        const content = body.content?.trim() ?? ''

        if (propertyIds.length === 0) {
            return NextResponse.json({ error: 'property_ids required' }, { status: 400 })
        }
        if (!title || !content) {
            return NextResponse.json({ error: 'title and content required' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { data: log, error: logError } = await admin
            .from('broadcast_logs')
            .insert([
                {
                    property_ids: propertyIds,
                    title,
                    content,
                    segment_type: body.segment_type ?? 'all',
                    segment_value: body.segment_value ?? '',
                    status: 'pending',
                },
            ])
            .select()
            .single()

        if (logError || !log) {
            console.error('[api/admin/broadcast] insert', logError)
            return NextResponse.json({ error: logError?.message ?? 'Failed to create log' }, { status: 500 })
        }

        const { error: fnError } = await admin.functions.invoke('process-broadcast', {
            body: { broadcastId: log.id },
        })

        if (fnError) {
            console.error('[api/admin/broadcast] invoke', fnError)
            return NextResponse.json(
                { log, warning: `配信ログは作成しましたが、関数呼び出しに失敗しました: ${fnError.message}` },
                { status: 202 }
            )
        }

        return NextResponse.json({ log, ok: true })
    } catch (e) {
        console.error('[api/admin/broadcast] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
