import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchPublicListingOwnerProfile } from '@/lib/supabase/fetch-property-detail'

/** 公開: エージェントプロフィール（物件詳細カード等） */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        if (!id?.trim()) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const agent = await fetchPublicListingOwnerProfile(admin, id.trim())
        if (!agent) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return NextResponse.json({ agent })
    } catch (e) {
        console.error('[api/agents/[id]/public] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
