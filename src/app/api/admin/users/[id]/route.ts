import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id: userId } = await context.params
        const body = (await request.json().catch(() => ({}))) as {
            plan?: string
            plan_type?: string
        }

        if (!body.plan) {
            return NextResponse.json({ error: 'plan required' }, { status: 400 })
        }

        const patch: Record<string, string | null> = {
            plan: body.plan,
            plan_type: body.plan_type ?? body.plan,
        }
        if (body.plan === 'premium') {
            patch.current_period_end = null
        }

        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('profiles')
            .update(patch)
            .eq('id', userId)
            .select('id')
            .maybeSingle()

        if (error) {
            console.error('[api/admin/users/[id]] PATCH', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!data) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/users/[id]] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
