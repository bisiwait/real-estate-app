import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'
import { listingExpiryIsoFromNow } from '@/lib/services/listingExpiry'

type PropertyAction =
    | 'approve'
    | 'reject'
    | 'delete'
    | 'restore'
    | 'assign_user'
    | 'status'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id: propertyId } = await context.params
        const body = (await request.json().catch(() => ({}))) as {
            action?: PropertyAction
            userId?: string | null
            status?: string
        }

        const admin = await createAdminClient()
        let shouldRevalidate = false

        if (body.action === 'approve' || body.action === 'restore') {
            const { error } = await admin
                .from('properties')
                .update({
                    is_approved: true,
                    status: 'published',
                    expiry_date: listingExpiryIsoFromNow(),
                })
                .eq('id', propertyId)
            if (error) throw error
            shouldRevalidate = true
        } else if (body.action === 'reject') {
            const { error } = await admin
                .from('properties')
                .update({ is_approved: false, status: 'draft' })
                .eq('id', propertyId)
            if (error) throw error
            shouldRevalidate = true
        } else if (body.action === 'delete') {
            const { error } = await admin.from('properties').delete().eq('id', propertyId)
            if (error) throw error
            shouldRevalidate = true
        } else if (body.action === 'assign_user') {
            const { error } = await admin
                .from('properties')
                .update({ user_id: body.userId || null })
                .eq('id', propertyId)
            if (error) throw error
            shouldRevalidate = true
        } else if (body.action === 'status' && body.status) {
            const updates: Record<string, unknown> = { status: body.status }
            if (body.status === 'published') {
                updates.is_approved = true
                updates.expiry_date = listingExpiryIsoFromNow()
            } else if (body.status === 'draft') {
                updates.is_approved = false
            }
            const { error } = await admin.from('properties').update(updates).eq('id', propertyId)
            if (error) throw error
            shouldRevalidate = true
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        if (shouldRevalidate) revalidatePropertyListPages()

        return NextResponse.json({ ok: true })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Internal server error'
        console.error('[api/admin/properties/[id]] PATCH', e)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
