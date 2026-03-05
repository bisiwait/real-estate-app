'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    ChevronRight,
    Search,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    Building2,
    Eye,
    Star,
    ArrowUpDown,
    Smartphone,
    Activity,
    ShieldCheck,
    AlertTriangle,
    Clock
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface AgentPerformance {
    id: string
    full_name: string
    email: string
    company_name: string
    is_verified: boolean
    is_suspended: boolean
    active_properties: number
    total_properties: number
    total_views: number
    total_favorites: number
    avg_response_time: number // hours
    response_rate: number // percentage
    last_activity: string
}

export default function AgentPerformanceTable({ onSelectAgent }: { onSelectAgent: (id: string) => void }) {
    const [agents, setAgents] = useState<AgentPerformance[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof AgentPerformance, direction: 'asc' | 'desc' } | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const PAGE_SIZE = 10

    const supabase = createClient()

    useEffect(() => {
        const fetchAgentPerformance = async () => {
            setLoading(true)

            // プロフィール取得
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_role', 'agent')

            if (pError) {
                console.error('Fetch profiles error:', pError)
                setLoading(false)
                return
            }

            // 物件統計と組み合わせる (本来は一つの複雑なクエリにするのが望ましいが、段階的に)
            const perfData: AgentPerformance[] = await Promise.all(profiles.map(async (p) => {
                const { data: props } = await supabase
                    .from('properties')
                    .select('id, status, total_views')
                    .eq('user_id', p.id)

                const activeCount = props?.filter(pr => pr.status === 'published').length || 0
                const totalCount = props?.length || 0
                const sumViews = props?.reduce((acc, curr) => acc + (curr.total_views || 0), 0) || 0

                // お気に入り数 (仮)
                const { count: favoritesCount } = await supabase
                    .from('favorites')
                    .select('id', { count: 'exact', head: true })
                    .in('property_id', props?.map(pr => pr.id) || [])

                return {
                    id: p.id,
                    full_name: p.full_name || 'Anonymous',
                    email: p.email,
                    company_name: p.company_name || 'N/A',
                    is_verified: p.is_verified || false,
                    is_suspended: p.is_suspended || false,
                    active_properties: activeCount,
                    total_properties: totalCount,
                    total_views: sumViews,
                    total_favorites: favoritesCount || 0,
                    avg_response_time: 2.5, // Mock
                    response_rate: 98, // Mock
                    last_activity: p.updated_at || p.created_at
                }
            }))

            setAgents(perfData)
            setLoading(false)
        }

        fetchAgentPerformance()
    }, [])

    // Sorting Logic
    const sortedAgents = [...agents].sort((a, b) => {
        if (!sortConfig) return 0
        const { key, direction } = sortConfig
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
        return 0
    })

    const filteredAgents = sortedAgents.filter(agent =>
        agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const paginatedAgents = filteredAgents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    const totalPages = Math.ceil(filteredAgents.length / PAGE_SIZE)

    const toggleSort = (key: keyof AgentPerformance) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'desc' }
        })
    }

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-black text-navy-secondary flex items-center gap-2">
                        <Activity className="w-6 h-6 text-navy-primary" />
                        パフォーマンス分析
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">エージェントの実績・活動状況</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="名前、メール、会社名で検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-navy-secondary focus:ring-2 focus:ring-navy-primary outline-none transition-all placeholder:text-slate-300"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-8 py-5">エージェント基本情報</th>
                            <th className="px-4 py-5 text-center">
                                <button onClick={() => toggleSort('active_properties')} className="flex items-center gap-1 mx-auto hover:text-navy-primary transition-colors">
                                    掲載数 <ArrowUpDown size={12} />
                                </button>
                            </th>
                            <th className="px-4 py-5 text-center">
                                <button onClick={() => toggleSort('total_views')} className="flex items-center gap-1 mx-auto hover:text-navy-primary transition-colors">
                                    総閲覧数 <ArrowUpDown size={12} />
                                </button>
                            </th>
                            <th className="px-4 py-5 text-center">
                                <button onClick={() => toggleSort('response_rate')} className="flex items-center gap-1 mx-auto hover:text-navy-primary transition-colors">
                                    レスポンス品質 <ArrowUpDown size={12} />
                                </button>
                            </th>
                            <th className="px-4 py-5 text-right">最終アクティビティ</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Loader2 className="w-10 h-10 text-navy-primary/10 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase">データを読み込み中...</p>
                                </td>
                            </tr>
                        ) : paginatedAgents.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-navy-secondary font-black">データが見つかりません</p>
                                    <p className="text-xs text-slate-400 mt-1">条件を変更してお試しください</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedAgents.map((agent) => (
                                <tr key={agent.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => onSelectAgent(agent.id)}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 bg-navy-primary/5 rounded-2xl flex items-center justify-center group-hover:bg-navy-primary transition-colors">
                                                    <Building2 className="w-6 h-6 text-navy-primary group-hover:text-white" />
                                                </div>
                                                {agent.is_verified && (
                                                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-navy-secondary">{agent.full_name}</p>
                                                    {agent.is_suspended && (
                                                        <span className="bg-red-50 text-red-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-100 uppercase">一時停止中</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400">{agent.company_name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50/50 rounded-xl">
                                            <span className="text-sm font-black text-navy-primary">{agent.active_properties}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">/ {agent.total_properties}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1 text-navy-secondary font-black">
                                                <Eye size={14} className="text-slate-300" />
                                                {agent.total_views.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-1">
                                                <Star size={10} fill="currentColor" />
                                                {agent.total_favorites}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <p className={cn(
                                                "text-xs font-black",
                                                agent.response_rate > 90 ? "text-emerald-500" : "text-amber-500"
                                            )}>{agent.response_rate}%</p>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                                                <Clock size={10} />
                                                平均 {agent.avg_response_time}時間
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-right">
                                        <p className="text-[11px] font-bold text-navy-secondary">{new Date(agent.last_activity).toLocaleDateString('ja-JP')}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(agent.last_activity).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-navy-primary hover:text-white transition-all shadow-sm border border-transparent">
                                            <ChevronRight size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        全 {totalPages} ページ中 {currentPage} ページ目
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)) }}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-100 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)) }}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-slate-100 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
