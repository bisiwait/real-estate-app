import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

export default async function AdminSecretDashboard() {
    const isUserAdmin = await isAdmin()

    if (!isUserAdmin) {
        redirect('/')
    }

    const supabase = await createClient()

    const { data: properties } = await supabase.from('properties').select('status, is_approved')
    const { data: contacts } = await supabase.from('inquiries').select('id, created_at')
    const { data: feedbacks } = await supabase.from('feedback').select('id, status')

    const pendingCount = properties?.filter(p => !p.is_approved).length || 0
    const activeCount = properties?.filter(p => p.is_approved && p.status === 'published').length || 0
    const newFeedbackCount = feedbacks?.filter(f => f.status === 'new').length || 0

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentInquiries = contacts?.filter(c => c.created_at >= oneDayAgo).length || 0

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-16 md:pt-24">
            <div className="container mx-auto px-4">
                <AdminDashboardClient
                    pendingCount={pendingCount}
                    activeCount={activeCount}
                    recentInquiries={recentInquiries}
                    newFeedbackCount={newFeedbackCount}
                />
            </div>
        </div>
    )
}
