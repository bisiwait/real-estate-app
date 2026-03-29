import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'
import {
    fetchAdminMailInquiries,
    fetchAdminLineLeads,
} from '@/lib/supabase/fetch-admin-inquiries'

export default async function AdminSecretDashboard({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const isUserAdmin = await isAdmin()

    if (!isUserAdmin) {
        redirect('/')
    }

    const supabaseAdmin = await createAdminClient()

    // RLS の差・is_admin() 判定のずれで inquiries が空になることがあるため、管理者画面は service role で集計する
    const [mailInquiries, lineLeads] = await Promise.all([
        fetchAdminMailInquiries(supabaseAdmin),
        fetchAdminLineLeads(supabaseAdmin),
    ])

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
                <AdminDashboardClient
                    pendingCount={pendingCount}
                    activeCount={activeCount}
                    recentInquiries={recentInquiries}
                    newFeedbackCount={newFeedbackCount}
                    locale={locale}
                    mailInquiries={mailInquiries}
                    lineLeads={lineLeads}
                />
            </div>
        </div>
    )
}
