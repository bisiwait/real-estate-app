import { NextRequest, NextResponse } from 'next/server'
import { requireAgentApiSession } from '@/lib/agent/require-agent-api-session'

/** エージェント: プロジェクト新規作成（RLS 回避） */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAgentApiSession()
        if ('error' in auth) return auth.error

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
        }

        const allowed = [
            'name',
            'area_id',
            'address',
            'image_url',
            'property_type',
            'year_built',
            'total_floors',
            'total_units',
            'total_buildings',
            'developer',
            'developer_id',
            'latitude',
            'longitude',
            'google_place_id',
            'google_maps_share_url',
            'facilities',
        ] as const

        const row: Record<string, unknown> = { name }
        for (const key of allowed) {
            if (key in body) row[key] = body[key]
        }
        row.updated_at = new Date().toISOString()

        const { data, error } = await auth.session.admin
            .from('projects')
            .insert(row)
            .select('id')
            .single()

        if (error) {
            console.error('[api/agent/projects] POST', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ project: data })
    } catch (e) {
        console.error('[api/agent/projects] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
