'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import {
    BarChart3,
    Home,
    UserCircle,
    MessageSquare,
    Mail,
    TrendingUp,
    CheckCircle,
    Clock,
    AlertTriangle,
    Sparkles,
    Bell,
    Building2,
    Lightbulb,
    ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import AdminPropertyManagement from './PropertyManagement'
import AdminUserManagement from './UserManagement'
import AdminProjectManagement from './ProjectManagement'
import AdminDeveloperManagement from './DeveloperManagement'
import AdminFeedbackManagement from './FeedbackManagement'
import AdminInquiriesPanel from './AdminInquiriesPanel'
import AdminAgentContactsPanel from './AdminAgentContactsPanel'
import type { AdminMailInquiryRow, AdminLineLeadRow } from '@/lib/supabase/fetch-admin-inquiries'
import {
    type AdminDashboardTabId as TabId,
    isAdminAgentDetailId,
    parseAdminDashboardTabFromSearchParams,
} from '@/lib/admin-dashboard-url'

const AgentInsights = nextDynamic(() => import('@/components/admin/AgentInsights'), {
    ssr: false,
    loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-slate-50/50" />,
})

interface Props {
    pendingCount: number
    activeCount: number
    recentInquiries: number
    newFeedbackCount: number
    /** サーバーが URL から解決した初期タブ（ハイドレーション整合用） */
    urlInitialTab: TabId
    locale: string
    mailInquiries: AdminMailInquiryRow[]
    lineLeads: AdminLineLeadRow[]
    /** エージェントID → 今月（日本時間の月初から）の LINE 問い合わせボタンクリック数 */
    lineInquiryClicksByAgent: Record<string, number>
}

export default function AdminDashboardClient({
    pendingCount,
    activeCount,
    recentInquiries,
    newFeedbackCount,
    urlInitialTab,
    locale,
    mailInquiries,
    lineLeads,
    lineInquiryClicksByAgent,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [tab, setTab] = useState<TabId>(urlInitialTab)
    const [feedbackTabBadge, setFeedbackTabBadge] = useState(newFeedbackCount)
    const consumedNewFeedbackBadgeIds = useRef(new Set<string>())

    /** 未対応（new）のカウントから1件分ずらす（展開 or ステータス変更で1回だけ） */
    const consumeNewFeedbackBadgeIfNeeded = useCallback((feedbackId: string) => {
        if (consumedNewFeedbackBadgeIds.current.has(feedbackId)) return
        consumedNewFeedbackBadgeIds.current.add(feedbackId)
        setFeedbackTabBadge((n) => Math.max(0, n - 1))
    }, [])

    useEffect(() => {
        setTab(parseAdminDashboardTabFromSearchParams(new URLSearchParams(searchParams.toString())))
    }, [searchParams])

    const selectTab = useCallback(
        (id: TabId) => {
            setTab(id)
            const p = new URLSearchParams(searchParams.toString())
            if (id === 'overview') {
                p.delete('tab')
                p.delete('agent')
            } else {
                p.set('tab', id)
                if (id !== 'agents') p.delete('agent')
            }
            const qs = p.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [pathname, router, searchParams]
    )

    const clearAgentDetail = useCallback(() => {
        const p = new URLSearchParams(searchParams.toString())
        p.delete('agent')
        p.set('tab', 'agents')
        router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    }, [pathname, router, searchParams])

    const detailAgentId = searchParams.get('agent')
    const showAgentInsights = tab === 'agents' && isAdminAgentDetailId(detailAgentId)

    const tabClass = (id: TabId) =>
        `flex min-h-14 flex-1 basis-[calc(50%-4px)] items-center justify-start gap-1.5 rounded-xl py-3 pl-2 pr-2 font-black transition-all cursor-pointer sm:min-h-0 sm:basis-auto sm:flex-none sm:gap-2 sm:px-3 sm:py-3.5 md:flex-1 ${
            tab === id
                ? 'bg-navy-primary text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50 hover:text-navy-secondary'
        }`

    const tabIconClass = 'h-5 w-5 shrink-0 sm:h-4 sm:w-4'
    const tabLabelClass = 'text-xs leading-tight sm:text-sm whitespace-nowrap'
    const tabBadgeClass =
        'ml-0.5 min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-black sm:ml-1 sm:text-[9px]'

    return (
        <>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-4">
                <div className="flex items-center space-x-2">
                    <div className="bg-amber-500 text-navy-secondary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                        Secret Mode
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Access Only</span>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
                    <Link href={`/${locale}/admin-secret/analytics`} className="flex items-center justify-center space-x-2 bg-indigo-50 border border-indigo-100 hover:border-indigo-300 text-indigo-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-sm transition-all shadow-sm">
                        <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>統計・分析</span>
                    </Link>
                    <Link href={`/${locale}/admin-secret/broadcast`} className="flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:border-navy-primary text-navy-secondary px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-sm transition-all shadow-sm">
                        <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-navy-primary" />
                        <span>一斉通知</span>
                    </Link>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 flex flex-wrap justify-start gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-md sm:mb-10">
                <button onClick={() => selectTab('overview')} className={`${tabClass('overview')} sm:flex-1`}>
                    <BarChart3 className={tabIconClass} />
                    <span className={tabLabelClass}>概要</span>
                </button>
                <button onClick={() => selectTab('projects')} className={`${tabClass('projects')} sm:flex-1`}>
                    <Building2 className={tabIconClass} />
                    <span className={tabLabelClass}>プロジェクト</span>
                </button>
                <button onClick={() => selectTab('developers')} className={`${tabClass('developers')} sm:flex-1`}>
                    <Building2 className={tabIconClass} />
                    <span className={tabLabelClass}>開発</span>
                </button>
                <button onClick={() => selectTab('properties')} className={`${tabClass('properties')} sm:flex-1`}>
                    <Home className={tabIconClass} />
                    <span className={tabLabelClass}>承認</span>
                    {pendingCount > 0 && (
                        <span className={`bg-red-500 text-white ${tabBadgeClass}`}>{pendingCount}</span>
                    )}
                </button>
                <button onClick={() => selectTab('agents')} className={`${tabClass('agents')} sm:flex-1`}>
                    <Building2 className={tabIconClass} />
                    <span className={tabLabelClass}>エージェント</span>
                </button>
                <button onClick={() => selectTab('general_users')} className={`${tabClass('general_users')} sm:flex-1`}>
                    <UserCircle className={tabIconClass} />
                    <span className={tabLabelClass}>ユーザー</span>
                </button>
                <button onClick={() => selectTab('inquiries')} className={`${tabClass('inquiries')} sm:flex-1`}>
                    <Mail className={tabIconClass} />
                    <span className={tabLabelClass}>問い合わせ</span>
                </button>
                <button onClick={() => selectTab('agent_contacts')} className={`${tabClass('agent_contacts')} sm:flex-1`}>
                    <MessageSquare className={tabIconClass} />
                    <span className={tabLabelClass}>エージェント問合せ</span>
                </button>
                <button onClick={() => selectTab('feedback')} className={`${tabClass('feedback')} sm:flex-1`}>
                    <Lightbulb className={tabIconClass} />
                    <span className={tabLabelClass}>要望</span>
                    {feedbackTabBadge > 0 && (
                        <span className={`bg-amber-500 text-white ${tabBadgeClass}`}>{feedbackTabBadge}</span>
                    )}
                </button>
            </div>

            {/* Summary Grid - Only on Overview */}
            {tab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-amber-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-amber-50 p-3 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <TrendingUp className="w-6 h-6 text-amber-500 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">¥ ---,---</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Stripe連携準備中</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-navy-primary/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-50 p-3 rounded-2xl group-hover:bg-navy-primary group-hover:text-white transition-colors">
                                <Home className="w-6 h-6 text-navy-primary group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Listings</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{activeCount} <span className="text-sm font-medium">物件</span></p>
                        <div className="flex items-center mt-1 text-emerald-500 font-bold text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" /> 公開中
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-red-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-red-50 p-3 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Clock className="w-6 h-6 text-red-500 group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{pendingCount} <span className="text-sm font-medium">物件</span></p>
                        <div className="flex items-center mt-1 text-red-500 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> 承認待ち
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 group hover:border-navy-secondary/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-navy-secondary group-hover:text-white transition-colors">
                                <MessageSquare className="w-6 h-6 text-navy-secondary group-hover:text-white" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquiries (24h)</span>
                        </div>
                        <p className="text-2xl font-black text-navy-secondary">{recentInquiries} <span className="text-sm font-medium">件</span></p>
                        <p className="text-xs text-slate-400 font-medium mt-1">直近24時間の問い合わせ</p>
                    </div>
                </div>
            )}

            {/* Main Management Section */}
            <div className="grid grid-cols-1 gap-12">
                {tab === 'overview' && (
                    <div className="hidden md:block bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-16 h-16 text-navy-primary/10 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-navy-secondary mb-4">管理者ダッシュボードへようこそ</h3>
                        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed">
                            上記のタブから、プロジェクト（建物マスター）、物件の承認、エージェント会員・一般ユーザー会員の管理、問い合わせや要望への対応を行えます。
                        </p>
                    </div>
                )}
                {tab === 'projects' && <AdminProjectManagement />}
                {tab === 'developers' && <AdminDeveloperManagement />}
                {tab === 'properties' && <AdminPropertyManagement />}
                {tab === 'agents' &&
                    (showAgentInsights ? (
                        <div className="animate-in fade-in space-y-6 duration-500">
                            <button
                                type="button"
                                onClick={clearAgentDetail}
                                className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-navy-primary transition-colors hover:text-blue-600"
                            >
                                <ChevronLeft className="transition-transform group-hover:-translate-x-1" size={16} />
                                エージェント会員一覧に戻る
                            </button>
                            <AgentInsights agentId={detailAgentId} />
                        </div>
                    ) : (
                        <AdminUserManagement
                            locale={locale}
                            variant="agent"
                            lineInquiryClicksByAgent={lineInquiryClicksByAgent}
                        />
                    ))}
                {tab === 'general_users' && <AdminUserManagement locale={locale} variant="general" />}
                {tab === 'inquiries' && (
                    <AdminInquiriesPanel
                        locale={locale}
                        mailInquiries={mailInquiries}
                        lineLeads={lineLeads}
                    />
                )}
                {tab === 'agent_contacts' && <AdminAgentContactsPanel />}
                {tab === 'feedback' && (
                    <AdminFeedbackManagement onConsumeNewFeedbackBadge={consumeNewFeedbackBadgeIfNeeded} />
                )}
            </div>
        </>
    )
}
