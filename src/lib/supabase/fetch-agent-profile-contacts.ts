import type { SupabaseClient } from '@supabase/supabase-js'

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
}

export async function fetchAgentProfileContacts(
    supabase: SupabaseClient,
    agentUserId: string
): Promise<{ rows: AgentProfileContactRow[]; error: Error | null }> {
    const { data, error } = await supabase
        .from('agent_contacts')
        .select(
            'id, agent_id, submitter_id, customer_name, customer_email, customer_phone, message, is_handled, created_at'
        )
        .eq('agent_id', agentUserId)
        .order('created_at', { ascending: false })
        .limit(300)

    if (error) {
        return { rows: [], error: new Error(error.message) }
    }

    return { rows: (data ?? []) as AgentProfileContactRow[], error: null }
}
