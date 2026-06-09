import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdminApi } from '@/lib/admin/api-auth'

/** 管理者: サイト全体分析データ */
export async function GET() {
    const gate = await assertAdminApi()
    if (gate.error) return gate.error

    try {
        const admin = await createAdminClient()
        const { data: leadRows, error: logsError } = await admin.from('inquiry_logs').select('*')

        if (logsError) {
            console.error('[api/admin/analytics] inquiry_logs', logsError)
            return NextResponse.json({ error: logsError.message }, { status: 500 })
        }

        const leads = leadRows ?? []
        const propertyIds = [...new Set(leads.map((l) => l.property_id).filter(Boolean))] as string[]
        const agentIds = [...new Set(leads.map((l) => l.agent_id).filter(Boolean))] as string[]

        const [{ data: props }, { data: agents }] = await Promise.all([
            propertyIds.length > 0
                ? admin.from('properties').select('id, title').in('id', propertyIds)
                : Promise.resolve({ data: [] as { id: string; title: string }[] }),
            agentIds.length > 0
                ? admin.from('profiles').select('id, full_name').in('id', agentIds)
                : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        ])

        const propMap = new Map((props ?? []).map((p) => [p.id as string, (p.title as string) || 'Unknown']))
        const agentMap = new Map(
            (agents ?? []).map((a) => [
                a.id as string,
                ((a.full_name as string) || 'Unknown Agent') as string,
            ])
        )

        const propertyCounts: Record<string, number> = {}
        const agentCounts: Record<string, number> = {}
        for (const l of leads) {
            const title = propMap.get(l.property_id) ?? 'Unknown'
            propertyCounts[title] = (propertyCounts[title] || 0) + 1
            const name = agentMap.get(l.agent_id) ?? 'Unknown Agent'
            agentCounts[name] = (agentCounts[name] || 0) + 1
        }

        const topProperties = Object.entries(propertyCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

        const topAgents = Object.entries(agentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

        return NextResponse.json({
            totalLeads: leads.length,
            lineLeads: leads.filter((l) => l.inquiry_type === 'line').length,
            phoneLeads: leads.filter((l) => l.inquiry_type === 'phone').length,
            topProperties,
            topAgents,
        })
    } catch (e) {
        console.error('[api/admin/analytics] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
