import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchRelatedPropertiesForDetail } from '@/lib/supabase/fetch-property-detail'

/** 公開: 同一建物・プロジェクトの関連物件 */
export async function GET(request: NextRequest) {
    try {
        const exclude = request.nextUrl.searchParams.get('exclude')?.trim() ?? ''
        const building = request.nextUrl.searchParams.get('building')?.trim() || null
        const project = request.nextUrl.searchParams.get('project')?.trim() || null

        if (!exclude) {
            return NextResponse.json({ error: 'exclude required' }, { status: 400 })
        }
        if (!building && !project) {
            return NextResponse.json({ properties: [] })
        }

        const admin = await createAdminClient()
        const properties = await fetchRelatedPropertiesForDetail(admin, exclude, building, project)
        return NextResponse.json({ properties })
    } catch (e) {
        console.error('[api/properties/related] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
