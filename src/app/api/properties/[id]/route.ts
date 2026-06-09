import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertAgentOwnsProperty } from '@/lib/supabase/assert-agent-property-access'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'

export async function DELETE(
    _request: NextRequest,
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

        const owned = await assertAgentOwnsProperty(user.id, propertyId)
        if (owned.error) {
            return NextResponse.json({ error: owned.error }, { status: owned.status })
        }

        const admin = await createAdminClient()
        const { data: deleted, error: deleteError } = await admin
            .from('properties')
            .delete()
            .eq('id', propertyId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle()

        if (deleteError) {
            console.error('[api/properties/[id]] DELETE', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }
        if (!deleted) {
            return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
        }

        revalidatePropertyListPages()

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/properties/[id]] DELETE unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
