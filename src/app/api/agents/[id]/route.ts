import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
    countAgentPublishedProperties,
    fetchAgentPublishedProperties,
    fetchPublicListingOwnerProfile,
} from '@/lib/supabase/fetch-property-detail'

/** 公開: エージェント詳細（プロフィール + 掲載物件） */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        if (!id?.trim()) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
        }

        const limitRaw = request.nextUrl.searchParams.get('limit')
        const limit = Math.min(Math.max(parseInt(limitRaw || '4', 10) || 4, 1), 24)

        const admin = await createAdminClient()
        const agent = await fetchPublicListingOwnerProfile(admin, id.trim())
        if (!agent) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const [properties, totalListings] = await Promise.all([
            fetchAgentPublishedProperties(admin, id.trim(), limit),
            countAgentPublishedProperties(admin, id.trim()),
        ])

        return NextResponse.json({ agent, properties, totalListings })
    } catch (e) {
        console.error('[api/agents/[id]] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
