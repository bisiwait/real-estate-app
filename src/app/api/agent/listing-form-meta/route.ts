import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sortListingFormAreas } from '@/lib/listing-form/sort-areas'

async function requireAgentSession() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const admin = await createAdminClient()
    const { data: profile, error } = await admin
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', user.id)
        .maybeSingle()

    if (error) {
        console.error('[api/agent/listing-form-meta] profile', error)
        return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
    }

    const isAgent =
        profile?.user_role === 'agent' ||
        profile?.user_role === 'admin' ||
        profile?.is_admin === true

    if (!isAgent) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { user, admin }
}

/** 物件登録フォーム: エリア・プロジェクト・デベロッパー（RLS 回避） */
export async function GET() {
    try {
        const session = await requireAgentSession()
        if ('error' in session && session.error) return session.error

        const { admin } = session

        const [areasRes, projectsRes, developersRes] = await Promise.all([
            admin!
                .from('areas')
                .select('id, name, region:regions(name)')
                .order('name'),
            admin!.from('projects').select('*, developers(name)').order('name'),
            admin!.from('developers').select('id, name').order('name'),
        ])

        if (areasRes.error) {
            console.error('[api/agent/listing-form-meta] areas', areasRes.error)
            return NextResponse.json({ error: areasRes.error.message }, { status: 500 })
        }
        if (projectsRes.error) {
            console.error('[api/agent/listing-form-meta] projects', projectsRes.error)
            return NextResponse.json({ error: projectsRes.error.message }, { status: 500 })
        }
        if (developersRes.error) {
            console.error('[api/agent/listing-form-meta] developers', developersRes.error)
            return NextResponse.json({ error: developersRes.error.message }, { status: 500 })
        }

        const areas = sortListingFormAreas(
            (areasRes.data ?? []).map((item) => ({
                id: item.id as string,
                name: item.name as string,
                region: (item.region as { name: string } | null) ?? { name: '' },
            }))
        )

        return NextResponse.json({
            areas,
            projects: projectsRes.data ?? [],
            developers: developersRes.data ?? [],
        })
    } catch (e) {
        console.error('[api/agent/listing-form-meta] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
