import { redirect } from 'next/navigation'

/** 旧 URL 互換: エージェント管理はメインダッシュボードのエージェントタブに統合済み */
export default async function AgentsManagementPageRedirect({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { locale } = await params
    const sp = await searchParams
    const agentRaw = sp.agent
    const agent = typeof agentRaw === 'string' ? agentRaw : undefined

    const q = new URLSearchParams()
    q.set('tab', 'agents')
    if (agent) q.set('agent', agent)

    redirect(`/${locale}/admin-secret?${q.toString()}`)
}
