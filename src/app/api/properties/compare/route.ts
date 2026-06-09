import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseCompareIds(raw: string | null): string[] {
    if (!raw?.trim()) return []
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter((id) => UUID_RE.test(id))
        .slice(0, 3)
}

async function requireGeneralUser() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

    const admin = await createAdminClient()
    const { data: profile } = await admin
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', user.id)
        .maybeSingle()

    const isAgent =
        profile?.is_admin === true ||
        profile?.user_role === 'admin' ||
        profile?.user_role === 'agent'

    if (isAgent) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { user }
}

export async function GET(request: NextRequest) {
    try {
        const auth = await requireGeneralUser()
        if ('error' in auth && auth.error) return auth.error

        const ids = parseCompareIds(request.nextUrl.searchParams.get('ids'))
        if (ids.length === 0) {
            return NextResponse.json({ properties: [] })
        }

        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('properties')
            .select(
                `
                *,
                area:areas(name, region:regions(name)),
                project:projects(facilities),
                developers(name)
            `
            )
            .in('id', ids)
            .eq('status', 'published')
            .eq('is_approved', true)

        if (error) {
            console.error('[api/properties/compare]', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const orderMap = new Map(ids.map((id, i) => [id, i]))
        const sorted = [...(data ?? [])].sort(
            (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
        )

        return NextResponse.json({ properties: sorted })
    } catch (e) {
        console.error('[api/properties/compare] unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
