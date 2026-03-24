import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Search, Users } from 'lucide-react'
import LeadsView from '@/components/dashboard/LeadsView'
import { fetchAgentInquiryLeads } from '@/lib/supabase/fetch-agent-leads'

export const dynamic = 'force-dynamic'

export default async function AgentLeadsPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { leads, error } = await fetchAgentInquiryLeads(supabase, user.id)
    if (error) {
        console.error('Error fetching leads:', error)
    }

    return (
        <div className="min-h-screen space-y-8 bg-slate-50 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-black text-navy-secondary">
                        <Users className="h-8 w-8 text-navy-primary" />
                        リード（見込み客）管理
                    </h1>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                        問い合わせごとに次のアクションとステータスを管理します。
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="検索（近日対応）"
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-400 focus:outline-none"
                    />
                </div>
            </div>

            {error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-800">
                    リード一覧の取得に失敗しました。ダッシュボードのコンソールログを確認するか、Supabase の
                    inquiry_logs と profiles のリレーション設定を確認してください。
                </div>
            ) : null}
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
                <LeadsView initialLeads={leads} locale={locale} />
            </div>
        </div>
    )
}
