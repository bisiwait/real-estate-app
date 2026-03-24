import type { SupabaseClient } from '@supabase/supabase-js'

/** LeadsView と共有する形（ネスト select に依存しない） */
export type AgentInquiryLead = {
  id: string
  created_at: string
  inquiry_type: string
  status: string
  property_id: string
  user_id: string | null
  notes?: string | null
  agent_id?: string
  property: { id: string; title: string } | null
  profile: {
    full_name: string | null
    email: string | null
    line_id: string | null
  } | null
}

/**
 * inquiry_logs は単体取得し、物件・問い合わせ元 profiles は別クエリで取得する。
 * PostgREST の複数 FK（user_id / agent_id → profiles）や embed 名の差で一覧が空になるのを防ぐ。
 */
export async function fetchAgentInquiryLeads(
  supabase: SupabaseClient,
  agentId: string
): Promise<{ leads: AgentInquiryLead[]; error: Error | null }> {
  const { data: rows, error: logsError } = await supabase
    .from('inquiry_logs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('fetchAgentInquiryLeads: inquiry_logs', logsError)
    return { leads: [], error: new Error(logsError.message) }
  }

  if (!rows?.length) {
    return { leads: [], error: null }
  }

  const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))]
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[]

  const { data: props, error: propErr } = await supabase
    .from('properties')
    .select('id, title')
    .in('id', propertyIds)

  if (propErr) {
    console.error('fetchAgentInquiryLeads: properties', propErr)
  }

  const { data: profs, error: profErr } =
    userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, line_id')
          .in('id', userIds)
      : { data: [], error: null }

  if (profErr) {
    console.error('fetchAgentInquiryLeads: profiles', profErr)
  }

  const propMap = new Map((props ?? []).map((p) => [p.id, p]))
  const profMap = new Map((profs ?? []).map((p) => [p.id, p]))

  const leads: AgentInquiryLead[] = rows.map((r) => {
    const p = propMap.get(r.property_id)
    const prof = r.user_id ? profMap.get(r.user_id) : undefined
    return {
      id: r.id,
      created_at: r.created_at,
      inquiry_type: r.inquiry_type,
      status: r.status,
      property_id: r.property_id,
      user_id: r.user_id,
      notes: r.notes,
      agent_id: r.agent_id,
      property: p ? { id: p.id, title: p.title } : null,
      profile: prof
        ? {
            full_name: prof.full_name,
            email: prof.email,
            line_id: prof.line_id,
          }
        : null,
    }
  })

  return { leads, error: null }
}
