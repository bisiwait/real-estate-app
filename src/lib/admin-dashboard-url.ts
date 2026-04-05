/** 管理者ダッシュボードのタブ ID（URL の ?tab= と同期） */
export type AdminDashboardTabId =
    | 'overview'
    | 'projects'
    | 'developers'
    | 'properties'
    | 'agents'
    | 'general_users'
    | 'feedback'
    | 'inquiries'

const TAB_SET = new Set<string>([
    'overview',
    'projects',
    'developers',
    'properties',
    'agents',
    'general_users',
    'feedback',
    'inquiries',
])

const AGENT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isAdminAgentDetailId(id: string | null | undefined): id is string {
    return typeof id === 'string' && AGENT_UUID_RE.test(id)
}

/** ?agent= が有効な UUID ならエージェントタブを強制 */
export function resolveAdminDashboardTab(input: { tab?: string; agent?: string }): AdminDashboardTabId {
    if (isAdminAgentDetailId(input.agent)) return 'agents'
    const t = input.tab
    if (t && TAB_SET.has(t)) return t as AdminDashboardTabId
    return 'overview'
}

export function parseAdminDashboardTabFromSearchParams(sp: URLSearchParams): AdminDashboardTabId {
    return resolveAdminDashboardTab({
        tab: sp.get('tab') ?? undefined,
        agent: sp.get('agent') ?? undefined,
    })
}
