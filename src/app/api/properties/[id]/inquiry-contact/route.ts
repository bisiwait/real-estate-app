import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { buildPropertyDetailAbsoluteUrl } from '@/lib/property-page-canonical-url'
import { buildPropertyInquiryContactPayload } from '@/lib/property-inquiry-contact'

export const dynamic = 'force-dynamic'

/** 物件ページの問い合わせチャネル（常に DB 最新。ISR キャッシュの影響を受けない） */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        if (!id?.trim()) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
        }

        const locale = request.nextUrl.searchParams.get('locale')?.trim() || 'jp'
        const hdrs = await headers()
        const hostname = hostHeaderFromHeaders(hdrs)
        const propertyDetailPageUrl = buildPropertyDetailAbsoluteUrl(hdrs, locale, id.trim())

        const admin = await createAdminClient()
        const { data: property, error } = await admin
            .from('properties')
            .select('*')
            .eq('id', id.trim())
            .maybeSingle()

        if (error) {
            console.error('[api/properties/[id]/inquiry-contact] property load', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!property) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const payload = await buildPropertyInquiryContactPayload(
            admin,
            property as Record<string, unknown>,
            locale,
            hostname,
            propertyDetailPageUrl
        )

        return NextResponse.json(payload)
    } catch (e) {
        console.error('[api/properties/[id]/inquiry-contact] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
