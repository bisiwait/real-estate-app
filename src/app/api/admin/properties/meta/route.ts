import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: 物件管理のメタ（エリア・デベロッパー・エージェント・品質統計） */
export async function GET() {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const admin = await createAdminClient()
        const [
            { data: areas, error: areaErr },
            { data: developers, error: devErr },
            { data: agents, error: agentErr },
            { data: qualityStats, error: qualityErr },
        ] = await Promise.all([
            admin.from('areas').select('id, name, slug').order('name'),
            admin.from('developers').select('id, name').order('name'),
            admin
                .from('profiles')
                .select('id, full_name, email')
                .eq('user_role', 'agent')
                .is('deleted_at', null)
                .order('full_name'),
            admin.rpc('admin_property_quality_stats'),
        ])

        if (areaErr) console.warn('[api/admin/properties/meta] areas', areaErr.message)
        if (devErr) console.warn('[api/admin/properties/meta] developers', devErr.message)
        if (agentErr) console.warn('[api/admin/properties/meta] agents', agentErr.message)
        if (qualityErr) console.warn('[api/admin/properties/meta] quality', qualityErr.message)

        return NextResponse.json({
            areas: areas ?? [],
            developers: developers ?? [],
            agents: agents ?? [],
            qualityStats:
                qualityStats && typeof qualityStats === 'object' && !Array.isArray(qualityStats)
                    ? qualityStats
                    : null,
        })
    } catch (e) {
        console.error('[api/admin/properties/meta] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
