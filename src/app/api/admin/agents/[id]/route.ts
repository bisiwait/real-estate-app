import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id: agentId } = await context.params
        const admin = await createAdminClient()

        const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('*')
            .eq('id', agentId)
            .maybeSingle()

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 500 })
        }
        if (!profile) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const [{ data: stale }, { data: props }] = await Promise.all([
            admin
                .from('properties')
                .select('id, title, updated_at')
                .eq('user_id', agentId)
                .lt('updated_at', thirtyDaysAgo.toISOString())
                .limit(10),
            admin.from('properties').select('id, status, total_views').eq('user_id', agentId),
        ])

        const totalViews =
            props?.reduce((acc, p) => acc + (Number(p.total_views) || 0), 0) ?? 0
        const activeListings = props?.filter((p) => p.status === 'published').length ?? 0

        let chartData: { date: string; views: number; inquiries: number }[] = []
        if (props && props.length > 0) {
            const propIds = props.map((p) => p.id as string)
            const { data: trendData } = await admin
                .from('property_stats')
                .select('date, views, inquiries')
                .in('property_id', propIds)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: true })

            chartData = (trendData ?? []) as typeof chartData
        }

        return NextResponse.json({
            profile,
            staleProperties: stale ?? [],
            stats: {
                totalViews,
                activeListings,
                conversions: 8.4,
                avgResponseTime: 1.8,
            },
            chartData,
        })
    } catch (e) {
        console.error('[api/admin/agents/[id]] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const { id: agentId } = await context.params
        const body = (await request.json().catch(() => ({}))) as {
            is_verified?: boolean
            is_suspended?: boolean
            admin_notes?: string
        }

        const admin = await createAdminClient()
        const isSuspended = body.is_suspended === true
        const { data, error } = await admin
            .from('profiles')
            .update({
                is_verified: body.is_verified === true,
                is_suspended: isSuspended,
                status: isSuspended ? 'suspended' : 'active',
                admin_notes: body.admin_notes ?? null,
            })
            .eq('id', agentId)
            .select('id')
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!data) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/admin/agents/[id]] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
