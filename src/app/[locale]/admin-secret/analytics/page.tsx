"use client";
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    BarChart3,
    TrendingUp,
    Download,
    Users,
    Home,
    MessageCircle,
    ArrowUpRight,
    ArrowLeft,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import AnalyticsCharts from './AnalyticsCharts'

export default function AdminAnalyticsPage() {
    const router = useRouter()
    const params = useParams()
    const locale = typeof params?.locale === 'string' ? params.locale : 'jp'
    const [totalLeads, setTotalLeads] = useState(0)
    const [lineLeads, setLineLeads] = useState(0)
    const [phoneLeads, setPhoneLeads] = useState(0)
    const [topProperties, setTopProperties] = useState<{name: string, count: number}[]>([])
    const [topAgents, setTopAgents] = useState<{name: string, count: number}[]>([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setFetchError(null)
            try {
                const profileRes = await fetch('/api/user/profile', { credentials: 'include' })
                if (!profileRes.ok) {
                    router.push(`/${locale}/login`)
                    return
                }
                const { profile } = (await profileRes.json()) as {
                    profile?: { is_admin?: boolean | null; user_role?: string | null }
                }
                const isAdminUser =
                    profile?.is_admin === true || profile?.user_role === 'admin'
                if (!isAdminUser) {
                    router.push(`/${locale}/dashboard`)
                    return
                }

                const res = await fetch('/api/admin/analytics')
                const data = (await res.json().catch(() => ({}))) as {
                    totalLeads?: number
                    lineLeads?: number
                    phoneLeads?: number
                    topProperties?: { name: string; count: number }[]
                    topAgents?: { name: string; count: number }[]
                    error?: string
                }

                if (!res.ok) {
                    setFetchError(data.error || 'データの取得に失敗しました')
                    return
                }

                setTotalLeads(data.totalLeads ?? 0)
                setLineLeads(data.lineLeads ?? 0)
                setPhoneLeads(data.phoneLeads ?? 0)
                setTopProperties(data.topProperties ?? [])
                setTopAgents(data.topAgents ?? [])
            } catch (e) {
                console.error('[admin analytics]', e)
                setFetchError(e instanceof Error ? e.message : 'データの取得に失敗しました')
            } finally {
                setLoading(false)
            }
        }
        void fetchData()
    }, [router, locale])

    if (loading) {
        return <div className="p-10 flex justify-center items-center min-h-screen"><RefreshCw className="animate-spin text-navy-primary w-10 h-10" /></div>
    }

    if (fetchError) {
        return (
            <div className="p-4 md:p-10 min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center max-w-lg mx-auto">
                <p className="text-navy-secondary font-black">分析データを読み込めませんでした</p>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">{fetchError}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 rounded-xl bg-navy-primary text-white font-bold hover:bg-navy-secondary"
                >
                    再読み込み
                </button>
                <Link href={`/${locale}/admin-secret`} className="text-sm font-bold text-navy-primary hover:underline">
                    管理者ダッシュボードに戻る
                </Link>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-10 space-y-10 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link
                        href={`/${locale}/admin-secret`}
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
