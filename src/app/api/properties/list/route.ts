import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
    executePropertyListQuery,
    formatPropertyListRows,
    parsePropertyListFiltersFromURLSearchParams,
    PROPERTY_LIST_PAGE_SIZE,
} from '@/lib/services/propertyListQuery'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const pageRaw = searchParams.get('page')
        const page = Math.max(0, Number.parseInt(pageRaw ?? '0', 10) || 0)

        const filterParams = new URLSearchParams(searchParams)
        filterParams.delete('page')

        const filters = parsePropertyListFiltersFromURLSearchParams(filterParams)
        const admin = await createAdminClient()
        const { data, error, count } = await executePropertyListQuery(admin, filters, page)

        if (error) {
            console.error('[api/properties/list]', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const properties = formatPropertyListRows(data)
        const from = page * PROPERTY_LIST_PAGE_SIZE
        const hasMore = count
            ? from + properties.length < count
            : properties.length === PROPERTY_LIST_PAGE_SIZE

        return NextResponse.json({
            properties,
            count: count ?? 0,
            page,
            hasMore,
        })
    } catch (e) {
        console.error('[api/properties/list] unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
