import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'
import { fetchAdminDuplicateTitlesOnPage } from '@/lib/supabase/admin-duplicate-titles'

export async function POST(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const body = (await request.json().catch(() => ({}))) as { titles?: string[] }
        const titles = body.titles
        if (!Array.isArray(titles)) {
            return NextResponse.json({ error: 'titles required' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const dup = await fetchAdminDuplicateTitlesOnPage(admin, titles)
        return NextResponse.json({ duplicates: [...dup] })
    } catch (e) {
        console.error('[api/admin/properties/duplicate-titles] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
