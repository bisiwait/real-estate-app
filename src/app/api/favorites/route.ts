import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const FAVORITES_SELECT = `
    id,
    property_id,
    created_at,
    property:properties (
        *,
        area:areas (
            name,
            region:regions (
                name
            )
        )
    )
`

function formatFavoriteProperties(rows: { property?: unknown }[] | null) {
    return (rows ?? [])
        .map((row) => row.property)
        .filter(Boolean)
        .map((p: any) => ({
            ...p,
            city_name: p.area?.region?.name || 'Pattaya',
            area_name: p.area?.name || 'Unknown',
            is_favorite: true,
        }))
}

async function requireSessionUser() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    return user
}

async function isAgentOrAdmin(userId: string) {
    const admin = await createAdminClient()
    const { data } = await admin
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', userId)
        .maybeSingle()
    return data?.is_admin === true || data?.user_role === 'admin' || data?.user_role === 'agent'
}

export async function GET(request: NextRequest) {
    try {
        const user = await requireSessionUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId = request.nextUrl.searchParams.get('propertyId')?.trim()
        const admin = await createAdminClient()

        if (propertyId) {
            const { data, error } = await admin
                .from('favorites')
                .select('id')
                .eq('user_id', user.id)
                .eq('property_id', propertyId)
                .maybeSingle()

            if (error) {
                console.error('[api/favorites] status', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ isFavorite: Boolean(data) })
        }

        const { data, error } = await admin
            .from('favorites')
            .select(FAVORITES_SELECT)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[api/favorites] list', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ favorites: formatFavoriteProperties(data) })
    } catch (e) {
        console.error('[api/favorites] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireSessionUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (await isAgentOrAdmin(user.id)) {
            return NextResponse.json({ error: 'Agents cannot use favorites' }, { status: 403 })
        }

        const body = (await request.json().catch(() => ({}))) as { propertyId?: string }
        const propertyId = body.propertyId?.trim()
        if (!propertyId) {
            return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { error } = await admin.from('favorites').upsert(
            {
                user_id: user.id,
                property_id: propertyId,
            },
            { onConflict: 'user_id,property_id', ignoreDuplicates: false }
        )

        if (error) {
            console.error('[api/favorites] insert', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/favorites] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await requireSessionUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const propertyId =
            request.nextUrl.searchParams.get('propertyId')?.trim() ||
            ((await request.json().catch(() => ({}))) as { propertyId?: string }).propertyId?.trim()

        if (!propertyId) {
            return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { error } = await admin
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('property_id', propertyId)

        if (error) {
            console.error('[api/favorites] delete', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/favorites] DELETE unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
