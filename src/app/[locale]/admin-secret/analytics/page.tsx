"use client";
export const runtime = 'edge';
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    BarChart3,
    TrendingUp,
    Download,
    Users,
    Home,
    MessageCircle,
    ArrowUpRight,
    Search,
    ArrowLeft,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
const AnalyticsCharts = nextDynamic(() => import('./AnalyticsCharts'), {
    ssr: false,
    loading: () => <div className="h-[300px] bg-slate-50/50 animate-pulse rounded-2xl" />
})

export const dynamic = 'force-dynamic'

export default function AdminAnalyticsPage() {
    const router = useRouter()
    const [totalLeads, setTotalLeads] = useState(0)
    const [lineLeads, setLineLeads] = useState(0)
    const [phoneLeads, setPhoneLeads] = useState(0)
    const [topProperties, setTopProperties] = useState<{name: string, count: number}[]>([])
    const [topAgents, setTopAgents] = useState<{name: string, count: number}[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Check admin status
            const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
            if (!profile?.is_admin) {
                router.push('/dashboard')
                return
            }

            // Fetch stats for analytics
            const { data: leadStats } = await supabase
                .from('inquiry_logs')
                .select(`
                    *,
                    property:properties(title),
                    agent:agent_id(full_name)
                `)

            // Simple aggregation
            const leads = leadStats || []
            setTotalLeads(leads.length)
            setLineLeads(leads.filter(l => l.inquiry_type === 'line').length)
            setPhoneLeads(leads.filter(l => l.inquiry_type === 'phone').length)

            // Most popular property
            const propertyCounts: Record<string, number> = {}
            leads.forEach(l => {
                const title = l.property?.title || 'Unknown'
                propertyCounts[title] = (propertyCounts[title] || 0) + 1
            })
            setTopProperties(Object.entries(propertyCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count })))

            // Best performing agents
            const agentCounts: Record<string, number> = {}
            leads.forEach(l => {
                const name = l.agent?.full_name || 'Unknown Agent'
                agentCounts[name] = (agentCounts[name] || 0) + 1
            })
            setTopAgents(Object.entries(agentCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count })))
            
            setLoading(false)
        }
        fetchData()
    }, [router])

    if (loading) {
        return <div className="p-10 flex justify-center items-center min-h-screen"><RefreshCw className="animate-spin text-navy-primary w-10 h-10" /></div>
    }

    return (
        <div className="p-4 md:p-10 space-y-10 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link
                        href="/admin-secret"
                        className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-navy-primary mb-4 transition-colors group"
                    >
                        <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" />
                        管理者ダッシュボードに戻る
                    </Link>
                    <h1 className="text-3xl font-black text-navy-secondary mb-2 flex items-center gap-3">
                        <BarChart3 className="w-10 h-10 text-navy-primary" />
                        サイト全体分析
                    </h1>
                    <p className="text-slate-500 font-bold">
                        問い合わせの発生状況とパフォーマンスを可視化します。
                    </p>
                </div>

                <button className="inline-flex items-center gap-2 bg-navy-primary hover:bg-navy-secondary text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-navy-primary/10 active:scale-95">
                    <Download className="w-5 h-5" />
                    データをCSVでエクスポート
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-navy-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">総リード数</p>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-navy-secondary">{totalLeads}</span>
                        <span className="text-emerald-500 font-black text-xs pb-1.5 flex items-center">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +12%
                        </span>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 group">
                    <p className="text-[10px] font-black text-[#06C755] uppercase tracking-widest mb-2">LINE 問い合わせ</p>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-navy-secondary">{lineLeads}</span>
                        <MessageCircle className="w-8 h-8 text-[#06C755] opacity-20 mb-1" />
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">電話 問い合わせ</p>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-black text-navy-secondary">{phoneLeads}</span>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">平均成約率</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-navy-secondary">8.4</span>
                        <span className="text-xl font-bold text-slate-400 pb-0.5">%</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-navy-secondary flex items-center gap-2">
                            <Home className="w-5 h-5 text-navy-primary" />
                            物件別の人気ランキング
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <AnalyticsCharts data={topProperties} type="bar" color="#3B82F6" />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-navy-secondary flex items-center gap-2">
                            <Users className="w-5 h-5 text-navy-primary" />
                            エージェント別パフォーマンス
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <AnalyticsCharts data={topAgents} type="bar" color="#8B5CF6" />
                    </div>
                </div>
            </div>
        </div>
    )
}
