import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreditSection from '@/components/dashboard/CreditSection'
import FlashMessage from '@/components/dashboard/FlashMessage'
import {
    PlusCircle,
    LayoutDashboard,
    Building2,
    Mail,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import PremiumPromoCard from '@/components/dashboard/PremiumPromoCard'
import PlanExpiredNotice from '@/components/dashboard/PlanExpiredNotice'
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus'
import { getEffectivePlan, isPremiumSubscriptionExpired } from '@/lib/utils/plan'
import FeedbackForm from '@/components/dashboard/FeedbackForm'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { fetchAgentInquiryLeads } from '@/lib/supabase/fetch-agent-leads'
import {
  getLineOfficialManagerChatUrl,
  LINE_OFFICIAL_ACCOUNT_APP_IOS,
  LINE_OFFICIAL_ACCOUNT_APP_ANDROID,
} from '@/lib/line-official'

export default async function DashboardPage({
    searchParams,
    params,
}: {
    searchParams: { tab?: string; profile_updated?: string; filter?: string; status?: string }
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const { tab = 'properties', profile_updated, filter = 'all', status = 'all' } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch Profile (plan / subscription fields)
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_type, full_name, phone, current_period_end, auto_renew, is_admin')
        .eq('id', user.id)
        .single()

    const activePlan = getEffectivePlan(profile)

    // Fetch Properties
    const { data: properties } = await supabase
        .from('properties')
        .select('*, area:areas(name), project:projects(*, developers(name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Fetch Inquiries
    const { data: rawInquiries, error: inquiriesError } = await supabase
        .from('inquiries')
        .select('*, property:properties(title)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

    if (inquiriesError) {
        console.error('Error fetching inquiries:', inquiriesError)
    }

    // Fetch Replies for these inquiries separately to avoid join complexity/RLS issues blocking the whole list
    let inquiries = rawInquiries || []
    if (inquiries.length > 0) {
        const inquiryIds = inquiries.map(i => i.id)
        const { data: allReplies, error: repliesError } = await supabase
            .from('inquiry_replies')
            .select('*')
            .in('inquiry_id', inquiryIds)

        if (repliesError) {
            console.error('Error fetching replies:', repliesError)
        } else {
            // Attach replies to their respective inquiries
            inquiries = inquiries.map(inq => ({
                ...inq,
                replies: allReplies?.filter(r => r.inquiry_id === inq.id) || []
            }))
        }

        const { data: linePushLogs, error: linePushLogsError } = await supabase
            .from('inquiry_logs')
            .select('inquiry_id, metadata')
            .in('inquiry_id', inquiryIds)
            .in('inquiry_type', ['agent_reply', 'admin_reply'])

        if (linePushLogsError) {
            console.error('Error fetching inquiry_logs (LINE push flags):', linePushLogsError)
        }
        const linePushSentIds = new Set<string>()
        for (const log of linePushLogs || []) {
            const m = log.metadata as { sent_via?: string } | null
            if (log.inquiry_id && m?.sent_via === 'line') {
                linePushSentIds.add(log.inquiry_id)
            }
        }
        inquiries = inquiries.map((inq) => {
            const row = inq as { id: string; first_reply_sent?: boolean | null }
            const fromColumn = row.first_reply_sent === true
            return {
                ...inq,
                line_push_already_sent: fromColumn || linePushSentIds.has(inq.id),
            }
        })
    }


    const { leads, error: leadsError } = await fetchAgentInquiryLeads(supabase, user.id)
    if (leadsError) {
        console.error('Error fetching inquiry_logs (leads):', leadsError)
    }

    const stats = {
        total: properties?.length || 0,
        published: properties?.filter(p => p.status === 'published' || p.status === 'under_negotiation' || p.status === 'contracted').length || 0,
        unreadInquiries: inquiries?.filter(i => !i.is_read).length || 0,
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header */}
            <div className="bg-navy-secondary py-8 md:py-12 text-white">
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                            <div className="bg-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
                                <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-3xl font-black tracking-tight truncate !text-slate-400">
                                    ダッシュボード
                                </h1>
                                <p className="text-slate-400 text-[10px] sm:text-sm font-medium mt-0.5 sm:mt-1 uppercase tracking-widest">Listing Management</p>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
                            {activePlan === 'premium' && (
                                <Link
                                    href={`/${locale}/dashboard/presale`}
                                    className="bg-amber-500 text-white px-4 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-bold hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2 w-full md:w-auto"
                                >
                                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    <span>プレセール投稿</span>
                                </Link>
                            )}
                            <Link
                                href={`/${locale}/list-property`}
                                className="bg-white text-navy-primary px-4 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-bold hover:bg-slate-50 transition-all shadow-lg flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                <span>物件を新規掲載する</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 mt-6 sm:-mt-10">
                {profile_updated === 'true' && (
                    <FlashMessage message="プロフィール情報を更新しました。" duration={3000} />
                )}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Stats Sidebar — スマホでは要望ボタンはページ下部（メインの下）へ */}
                    <div className="order-1 lg:col-span-1 space-y-6">
                        {/* Subscription Status (Trial countdown / Portal link) */}
                        <SubscriptionStatus profile={profile} />

                        {/* プラン表示（フリープラン時のみ。プレミアムは別カード） */}
                        {activePlan !== 'premium' && (
                            <CreditSection profile={profile} />
                        )}

                        {isPremiumSubscriptionExpired(profile) && <PlanExpiredNotice />}

                        {/* Premium Promo Card (Free users only) */}
                        {activePlan !== 'premium' && (
                            <PremiumPromoCard plan={activePlan} />
                        )}

                        {/* Summary List */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">概要</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="text-sm font-bold">公開中</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.published}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-navy-primary/5 text-navy-primary">
                                    <div className="flex items-center space-x-3">
                                        <Mail className="w-5 h-5" />
                                        <span className="text-sm font-bold">新着お問い合わせ</span>
                                    </div>
                                    <span className="text-lg font-black">{stats.unreadInquiries}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 text-amber-600">
                                    <div className="flex items-center space-x-3">
                                        <Clock className="w-5 h-5" />
                                        <span className="text-sm font-bold">承認待ち</span>
                                    </div>
                                    <span className="text-lg font-black">{properties?.filter(p => p.status === 'pending').length || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50 text-red-600">
                                    <div className="flex items-center space-x-3">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-sm font-bold">期限切れ等</span>
                                    </div>
                                    <span className="text-lg font-black">{(properties?.filter(p => p.status === 'expired').length || 0) + (properties?.filter(p => p.status === 'draft').length || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block">
                            <FeedbackForm />
                        </div>
                    </div>

                    {/* Main area (Client Component for fast tab switching) — lg:contents でグリッド列配置を維持 */}
                    <div className="order-2 min-w-0 lg:contents">
                        <DashboardClient
                            initialTab={tab}
                            initialFilter={filter}
                            initialStatus={status}
                            profile={profile}
                            initialProperties={properties || []}
                            initialInquiries={inquiries}
                            leadsCount={leads.length}
                            initialLeads={leads}
                            locale={locale}
                            activePlan={activePlan}
                            lineOfficialManagerChatUrl={getLineOfficialManagerChatUrl()}
                            lineOfficialAccountAppIosUrl={LINE_OFFICIAL_ACCOUNT_APP_IOS}
                            lineOfficialAccountAppAndroidUrl={LINE_OFFICIAL_ACCOUNT_APP_ANDROID}
                        />
                    </div>

                    <div className="order-3 lg:hidden">
                        <FeedbackForm />
                    </div>
                </div>
            </div>
        </div >
    )
}
