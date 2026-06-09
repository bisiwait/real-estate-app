import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAgentOtherPropertiesForDetail } from '@/lib/supabase/fetch-property-detail'

/** 公開: 同一エージェントの他物件 */
export async function GET(request: NextRequest) {
    try {
        const agentId = request.nextUrl.searchParams.get('agentId')?.trim() ?? ''
        const exclude = request.nextUrl.searchParams.get('exclude')?.trim() ?? ''

        if (!agentId || !exclude) {
            return NextResponse.json({ error: 'agentId and exclude required' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const properties = await fetchAgentOtherPropertiesForDetail(admin, agentId, exclude)
        return NextResponse.json({ properties })
    } catch (e) {
        console.error('[api/properties/agent-listings] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
