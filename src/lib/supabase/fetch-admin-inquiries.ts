import type { SupabaseClient } from '@supabase/supabase-js'

/** メールフォーム経由の inquiries（管理者一覧用） */
export type AdminMailInquiryRow = {
  id: string
  created_at: string
  inquirer_name: string
  inquirer_email: string
  inquirer_phone: string | null
  message: string
  is_read: boolean
  property_id: string
  owner_id: string
  property_title: string | null
  owner_name: string | null
  preferred_reply_channel: string | null
  line_user_id: string | null
  first_reply_sent?: boolean | null
}

/** LINE ボタン等の inquiry_logs（line のみ、管理者一覧用） */
export type AdminLineLeadRow = {
  id: string
  created_at: string
  inquiry_type: string
  status: string
  property_id: string
  user_id: string | null
  agent_id: string
  property_title: string | null
  agent_name: string | null
  inquirer_name: string | null
  inquirer_email: string | null
  inquirer_line_id: string | null
}

/** 管理者ダッシュボード専用。RLS を避けるため service role の Supabase クライアントを渡すこと。 */
export async function fetchAdminMailInquiries(
  supabase: SupabaseClient
): Promise<AdminMailInquiryRow[]> {
  const { data: rows, error } = await supabase
    .from('inquiries')
    .select(
      'id, created_at, inquirer_name, inquirer_email, inquirer_phone, message, is_read, property_id, owner_id, preferred_reply_channel, line_user_id, first_reply_sent'
    )
    .order('created_at', { ascending: false })
    .limit(400)

  if (error) {
    console.error('fetchAdminMailInquiries:', error)
    return []
  }
  if (!rows?.length) return []

  const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))]
  const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))] as string[]

  const { data: props } = await supabase
    .from('properties')
    .select('id, title')
    .in('id', propertyIds)

  const { data: profs } =
    ownerIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', ownerIds)
      : { data: [] }

  const propMap = new Map((props ?? []).map((p) => [p.id, p.title as string]))
  const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name as string | null]))

  return rows.map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    inquirer_name: r.inquirer_name as string,
    inquirer_email: r.inquirer_email as string,
    inquirer_phone: (r.inquirer_phone as string | null) ?? null,
    message: r.message as string,
    is_read: Boolean(r.is_read),
    property_id: r.property_id as string,
    owner_id: r.owner_id as string,
    property_title: r.property_id ? propMap.get(r.property_id as string) ?? null : null,
    owner_name: r.owner_id ? profMap.get(r.owner_id as string) ?? null : null,
    preferred_reply_channel: (r.preferred_reply_channel as string | null) ?? 'email',
    line_user_id: (r.line_user_id as string | null) ?? null,
    first_reply_sent: Boolean((r as { first_reply_sent?: boolean | null }).first_reply_sent),
  }))
}

/** 管理者ダッシュボード専用。`fetchAdminMailInquiries` と同様 service role クライアント推奨。 */
export async function fetchAdminLineLeads(
  supabase: SupabaseClient
): Promise<AdminLineLeadRow[]> {
  const { data: rows, error } = await supabase
    .from('inquiry_logs')
    .select('*')
    .eq('inquiry_type', 'line')
    .order('created_at', { ascending: false })
    .limit(400)

  if (error) {
    console.error('fetchAdminLineLeads:', error)
    return []
  }
  if (!rows?.length) return []

  const propertyIds = [...new Set(rows.map((r) => r.property_id))]
  const profileIds = [
    ...new Set([
      ...rows.map((r) => r.user_id).filter(Boolean),
      ...rows.map((r) => r.agent_id),
    ]),
  ] as string[]

  const { data: props } = await supabase
    .from('properties')
    .select('id, title')
    .in('id', propertyIds)

  const { data: profs } =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, line_id')
          .in('id', profileIds)
      : { data: [] }

  const propMap = new Map((props ?? []).map((p) => [p.id, p.title as string]))
  const profMap = new Map(
    (profs ?? []).map((p) => [
      p.id,
      {
        full_name: p.full_name as string | null,
        email: p.email as string | null,
        line_id: p.line_id as string | null,
      },
    ])
  )

  return rows.map((r) => {
    const inq = r.user_id ? profMap.get(r.user_id) : null
    const agent = profMap.get(r.agent_id)
    return {
      id: r.id,
      created_at: r.created_at,
      inquiry_type: r.inquiry_type,
      status: r.status,
      property_id: r.property_id,
      user_id: r.user_id,
      agent_id: r.agent_id,
      property_title: propMap.get(r.property_id) ?? null,
      agent_name: agent?.full_name ?? null,
      inquirer_name: inq?.full_name ?? null,
      inquirer_email: inq?.email ?? null,
      inquirer_line_id: inq?.line_id ?? null,
    }
  })
}
