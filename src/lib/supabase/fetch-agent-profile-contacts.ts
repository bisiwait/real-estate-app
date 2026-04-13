import type { SupabaseClient } from '@supabase/supabase-js'

export type AgentProfileContactReply = {
    id: string
    message: string
    created_at: string
}

export type AgentProfileContactRow = {
    id: string
    agent_id: string
    submitter_id: string | null
    customer_name: string
    customer_email: string
    customer_phone: string
    message: string
    is_handled: boolean
    created_at: string
    read_by_agent_at: string | null
    replies: AgentProfileContactReply[]
}

export async function fetchAgentProfileContacts(
    supabase: SupabaseClient,
    agentUserId: string
): Promise<{ rows: AgentProfileContactRow[]; error: Error | null }> {
    const { data: rawRows, error } = await supabase
        .from('agent_contacts')
        .select(
            'id, agent_id, submitter_id, customer_name, customer_email, customer_phone, message, is_handled, created_at, read_by_agent_at'
        )
        .eq('agent_id', agentUserId)
        .order('created_at', { ascending: false })
        .limit(300)

    if (error) {
        return { rows: [], error: new Error(error.message) }
    }

    const rows = rawRows ?? []
    const ids = rows.map((r) => r.id as string).filter(Boolean)
    const byContact: Record<string, AgentProfileContactReply[]> = {}

    if (ids.length > 0) {
        const { data: repRows, error: repErr } = await supabase
            .from('agent_contact_replies')
            .select('id, agent_contact_id, message, created_at')
            .in('agent_contact_id', ids)
            .order('created_at', { ascending: true })

        if (repErr) {
            return { rows: [], error: new Error(repErr.message) }
        }

        for (const r of repRows ?? []) {
            const cid = r.agent_contact_id as string
            if (!cid) continue
            if (!byContact[cid]) byContact[cid] = []
            byContact[cid].push({
                id: r.id as string,
                message: r.message as string,
                created_at: r.created_at as string,
            })
        }
    }

    const merged: AgentProfileContactRow[] = rows.map((r) => ({
        id: r.id as string,
        agent_id: r.agent_id as string,
        submitter_id: (r.submitter_id as string | null) ?? null,
        customer_name: r.customer_name as string,
        customer_email: r.customer_email as string,
        customer_phone: r.customer_phone as string,
        message: r.message as string,
        is_handled: Boolean(r.is_handled),
        created_at: r.created_at as string,
        read_by_agent_at: (r.read_by_agent_at as string | null) ?? null,
        replies: byContact[r.id as string] ?? [],
    }))

    return { rows: merged, error: null }
}
