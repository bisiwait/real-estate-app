import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'
import {
    ADMIN_PROP_AREA,
    ADMIN_PROP_DEVELOPER_ID,
    ADMIN_PROP_LIST_FILTER,
    ADMIN_PROP_MAX_PRICE,
    ADMIN_PROP_MIN_PRICE,
    ADMIN_PROP_PROPERTY_TYPE,
    ADMIN_PROP_SEARCH,
    parseAdminPropListFilter,
    parseOptionalPositiveNumber,
    parseOptionalUuid,
} from '@/lib/admin-property-list-url'
import {
    fetchAdminPropertiesPage,
    resolveAdminPropertyAreaFilter,
} from '@/lib/supabase/admin-properties-list-query'

/** 管理者: 物件一覧ページ */
export async function GET(request: NextRequest) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const sp = request.nextUrl.searchParams
        const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
        const limit = Math.max(1, Math.min(100, Number.parseInt(sp.get('limit') ?? '20', 10) || 20))

        const filter = parseAdminPropListFilter(sp.get(ADMIN_PROP_LIST_FILTER))
        const urlSearch = (sp.get(ADMIN_PROP_SEARCH) ?? '').trim()
        const areaSlug = (sp.get(ADMIN_PROP_AREA) ?? '').trim()
        const propertyTypeParam = (sp.get(ADMIN_PROP_PROPERTY_TYPE) ?? '').trim()
        const developerIdParam = parseOptionalUuid(sp.get(ADMIN_PROP_DEVELOPER_ID))
        const minPriceUrl = parseOptionalPositiveNumber(sp.get(ADMIN_PROP_MIN_PRICE))
        const maxPriceUrl = parseOptionalPositiveNumber(sp.get(ADMIN_PROP_MAX_PRICE))

        const admin = await createAdminClient()
        const { data: areaRows } = await admin.from('areas').select('id, name, slug').order('name')
        const areaResolved = resolveAdminPropertyAreaFilter(areaSlug, areaRows ?? [])

        const { rows, count, error } = await fetchAdminPropertiesPage(admin, {
            listFilter: filter,
            urlSearch,
            area: areaResolved,
            propertyTypeParam,
            developerIdParam,
            minPriceUrl,
            maxPriceUrl,
            page,
            limit,
        })

        if (error) {
            console.error('[api/admin/properties/list] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ rows, count })
    } catch (e) {
        console.error('[api/admin/properties/list] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
