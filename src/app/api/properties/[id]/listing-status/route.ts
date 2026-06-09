import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'

type ListingStatusAction = 'end' | 'republish'

async function assertOwnerProperty(propertyId: string, userId: string) {
    const admin = await createAdminClient()
    const { data, error } = await admin
        .from('properties')
        .select('id, user_id, status, is_approved')
        .eq('id', propertyId)
        .maybeSingle()

    if (error) {
        return { error: error.message, status: 500 as const, property: null }
    }
    if (!data) {
        return { error: 'Property not found', status: 404 as const, property: null }
    }
    if (data.user_id !== userId) {
        return { error: 'Forbidden', status: 403 as const, property: null }
    }
    return { error: null, status: 200 as const, property: data }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: propertyId } = await context.params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = (await request.json().catch(() => ({}))) as { action?: ListingStatusAction }
        const action = body.action
        if (action !== 'end' && action !== 'republish') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const owned = await assertOwnerProperty(propertyId, user.id)
        if (!owned.property) {
            return NextResponse.json({ error: owned.error }, { status: owned.status })
        }

        const property = owned.property
        let nextStatus: string

        if (action === 'end') {
            if (property.status !== 'published') {
                return NextResponse.json({ error: 'Not published' }, { status: 400 })
            }
            nextStatus = 'draft'
        } else {
            if (property.status !== 'draft') {
                return NextResponse.json({ error: 'Not draft' }, { status: 400 })
            }
            nextStatus = property.is_approved ? 'published' : 'pending'
        }

        const admin = await createAdminClient()
        const { data: updated, error: updateError } = await admin
            .from('properties')
            .update({ status: nextStatus })
            .eq('id', propertyId)
            .eq('user_id', user.id)
            .select('id, status')
            .maybeSingle()

        if (updateError) {
            console.error('[api/properties/listing-status] PATCH', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
        if (!updated) {
            return NextResponse.json({ error: 'Update failed' }, { status: 500 })
        }

        revalidatePropertyListPages()

        return NextResponse.json({ property: updated })
    } catch (e) {
        console.error('[api/properties/listing-status] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
