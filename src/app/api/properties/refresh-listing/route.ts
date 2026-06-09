import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertAgentOwnsProperties } from '@/lib/supabase/assert-agent-property-access'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'
import { listingExpiryIsoFromNow } from '@/lib/services/listingExpiry'

/** 掲載更新（last_confirmed_at / updated_at / expiry_date）— 公開中のみ・単体・一括 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = (await request.json().catch(() => ({}))) as { propertyIds?: string[] }
        const propertyIds = body.propertyIds
        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
            return NextResponse.json({ error: 'propertyIds required' }, { status: 400 })
        }

        const owned = await assertAgentOwnsProperties(user.id, propertyIds)
        if (owned.error) {
            return NextResponse.json({ error: owned.error }, { status: owned.status })
        }

        const now = new Date().toISOString()
        const admin = await createAdminClient()
        const { data: updated, error: updateError } = await admin
            .from('properties')
            .update({
                last_confirmed_at: now,
                updated_at: now,
                expiry_date: listingExpiryIsoFromNow(),
            })
            .in('id', owned.ids)
            .eq('user_id', user.id)
            .eq('status', 'published')
            .select('id')

        if (updateError) {
            console.error('[api/properties/refresh-listing] POST', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        if (!updated?.length) {
            return NextResponse.json(
                { error: '公開中の物件のみ掲載更新できます' },
                { status: 400 }
            )
        }

        revalidatePropertyListPages()

        return NextResponse.json({ updatedCount: updated.length, propertyIds: updated.map((r) => r.id) })
    } catch (e) {
        console.error('[api/properties/refresh-listing] POST unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
