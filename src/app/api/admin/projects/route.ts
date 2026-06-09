import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'
import {
    escapeIlikePattern,
    parseAdminListLimit,
    parseAdminListPage,
} from '@/lib/admin-list-url'

type AreaRow = { id: string; name: string; region?: { name: string } | null }

function sortAreas(mappedAreas: AreaRow[]) {
    mappedAreas.sort((a, b) => {
        const regionA = a.region?.name || ''
        const regionB = b.region?.name || ''
        if (regionA === 'Pattaya' && regionB !== 'Pattaya') return -1
        if (regionA !== 'Pattaya' && regionB === 'Pattaya') return 1
        if (regionA === 'Sriracha' && regionB !== 'Sriracha') return -1
        if (regionA !== 'Sriracha' && regionB === 'Sriracha') return 1
        if (regionA !== regionB) return regionA.localeCompare(regionB)
        return a.name.localeCompare(b.name)
    })
    return mappedAreas
}

/** 管理者: プロジェクト管理メタ（エリア・デベロッパー） */
export async function GET(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    const metaOnly = request.nextUrl.searchParams.get('meta') === '1'
    if (metaOnly) {
        try {
            const admin = await createAdminClient()
            const [areasRes, developersRes] = await Promise.all([
                admin.from('areas').select('id, name, region:regions(name)').order('name'),
                admin.from('developers').select('id, name').order('name'),
            ])
            if (areasRes.error) {
                return NextResponse.json({ error: areasRes.error.message }, { status: 500 })
            }
            const areas = sortAreas(
                (areasRes.data ?? []).map((item) => ({
                    id: item.id as string,
                    name: item.name as string,
                    region: (item.region as { name: string } | null) ?? { name: '' },
                }))
            )
            return NextResponse.json({
                areas,
                developers: developersRes.data ?? [],
            })
        } catch (e) {
            console.error('[api/admin/projects] GET meta unexpected', e)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    }

    const page = parseAdminListPage(request.nextUrl.searchParams.get('page'))
    const limit = parseAdminListLimit(request.nextUrl.searchParams.get('limit'))
    const search = (request.nextUrl.searchParams.get('search') ?? '').trim().replace(/,/g, '')
    const filterMissingInfo = request.nextUrl.searchParams.get('missing') === '1'

    try {
        const admin = await createAdminClient()

        let areas: AreaRow[] = []
        if (search) {
            const { data: areasData } = await admin
                .from('areas')
                .select('id, name, region:regions(name)')
                .order('name')
            areas = (areasData ?? []).map((item) => ({
                id: item.id as string,
                name: item.name as string,
                region: (item.region as { name: string } | null) ?? { name: '' },
            }))
        }

        let q = admin.from('projects').select('*', { count: 'exact', head: false }).order('name')
        if (filterMissingInfo) {
            q = q.or('year_built.is.null,total_floors.is.null')
        }
        if (search) {
            const pattern = `%${escapeIlikePattern(search)}%`
            const qLower = search.toLowerCase()
            const parts = [`name.ilike.${pattern}`, `name_jp.ilike.${pattern}`]
            const areaMatchIds = areas
                .filter((a) => {
                    const n = (a.name || '').toLowerCase()
                    const r = (a.region?.name || '').toLowerCase()
                    return n.includes(qLower) || r.includes(qLower)
                })
                .map((a) => a.id)
            if (areaMatchIds.length > 0) {
                parts.push(`area_id.in.(${areaMatchIds.join(',')})`)
            }
            q = q.or(parts.join(','))
        }

        const from = (page - 1) * limit
        const to = from + limit - 1
        const { data, error, count } = await q.range(from, to)

        if (error) {
            console.error('[api/admin/projects] GET list', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            projects: data ?? [],
            totalCount: typeof count === 'number' ? count : (data?.length ?? 0),
        })
    } catch (e) {
        console.error('[api/admin/projects] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/** 管理者: プロジェクト新規作成 */
export async function POST(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const body = await request.json()
        const admin = await createAdminClient()
        const { error } = await admin.from('projects').insert([body])
        if (error) {
            console.error('[api/admin/projects] POST', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/projects] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
