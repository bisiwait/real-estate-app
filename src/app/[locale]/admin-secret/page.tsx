import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import {
    fetchAdminMailInquiries,
    fetchAdminLineLeads,
} from '@/lib/supabase/fetch-admin-inquiries'
import { resolveAdminDashboardTab } from '@/lib/admin-dashboard-url'
import { startOfCurrentMonthJstIso } from '@/lib/datetime/jst-month-start'

export default async function AdminSecretDashboard({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { locale } = await params
    const sp = await searchParams
    const tabParam = typeof sp.tab === 'string' ? sp.tab : undefined
    const agentParam = typeof sp.agent === 'string' ? sp.agent : undefined
    const urlInitialTab = resolveAdminDashboardTab({ tab: tabParam, agent: agentParam })
    const isUserAdmin = await isAdmin()

    if (!isUserAdmin) {
        redirect('/')
    }

    const dict = await getDictionary(locale)
    const impRaw = (dict as { admin_impersonation?: { login_as_agent: string; confirm: string } }).admin_impersonation
    const impersonationCopy = {
        login_as_agent: impRaw?.login_as_agent ?? 'エージェントとしてログイン',
        confirm:
            impRaw?.confirm ??
            'このエージェントとしてログインし、ダッシュボード等を代行操作しますか？\n画面上部から管理者に戻れます。',
    }

    const supabaseAdmin = await createAdminClient()

    // RLS の差・is_admin() 判定のずれで inquiries が空になることがあるため、管理者画面は service role で集計する
    const monthStartJst = startOfCurrentMonthJstIso()

    const [mailInquiries, lineLeads, lineClickRows] = await Promise.all([
        fetchAdminMailInquiries(supabaseAdmin),
        fetchAdminLineLeads(supabaseAdmin),
        supabaseAdmin.from('line_inquiry_counts').select('agent_id').gte('created_at', monthStartJst),
    ])

    const lineInquiryClicksByAgent: Record<string, number> = {}
    if (!lineClickRows.error && lineClickRows.data) {
        for (const row of lineClickRows.data) {
            const aid = row.agent_id as string
            lineInquiryClicksByAgent[aid] = (lineInquiryClicksByAgent[aid] ?? 0) + 1
        }
    } else if (lineClickRows.error) {
        console.warn('[admin-secret] line_inquiry_counts:', lineClickRows.error.message)
    }

    const { data: properties } = await supabaseAdmin.from('properties').select('status, is_approved')
    const { data: contacts } = await supabaseAdmin.from('inquiries').select('id, created_at')
    const { data: feedbacks } = await supabaseAdmin.from('feedback').select('id, status')

    const pendingCount = properties?.filter(p => !p.is_approved).length || 0
    const activeCount = properties?.filter(p => p.is_approved && p.status === 'published').length || 0
    const newFeedbackCount = feedbacks?.filter(f => f.status === 'new').length || 0

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentInquiries = contacts?.filter(c => c.created_at >= oneDayAgo).length || 0

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-6 md:pt-24">
            <div className="container mx-auto px-4">
                <Suspense
                    fallback={
                        <div className="flex min-h-[40vh] items-center justify-center text-sm font-bold text-slate-400">
                            読み込み中…
                        </div>
                    }
                >
                    <AdminDashboardClient
                        pendingCount={pendingCount}
                        activeCount={activeCount}
                        recentInquiries={recentInquiries}
                        newFeedbackCount={newFeedbackCount}
                        locale={locale}
                        mailInquiries={mailInquiries}
                        lineLeads={lineLeads}
                        lineInquiryClicksByAgent={lineInquiryClicksByAgent}
                        urlInitialTab={urlInitialTab}
                        impersonationCopy={impersonationCopy}
                    />
                </Suspense>
            </div>
        </div>
    )
}
