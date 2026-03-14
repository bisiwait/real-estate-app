'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ChevronLeft,
    Users,
    ArrowLeft,
    Download,
    Filter,
    LayoutDashboard
} from 'lucide-react'
import AgentPerformanceTable from '@/components/admin/AgentPerformanceTable'
import AgentInsights from '@/components/admin/AgentInsights'

export default function AgentsManagementPage() {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-wrap items-end justify-between mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Link href="/admin-secret" className="p-2 bg-white rounded-xl text-slate-400 hover:text-navy-primary transition-all shadow-sm">
                                <ArrowLeft size={16} />
                            </Link>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200">
                                <LayoutDashboard size={12} className="text-navy-primary" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">管理者ダッシュボード</span>
                            </div>
                        </div>

                        <h2 className="text-4xl font-black text-navy-secondary tracking-tight">
                            {selectedAgentId ? 'エージェント詳細' : 'エージェント管理'}
                        </h2>
                        <p className="text-sm font-bold text-slate-400 mt-2">
                            {selectedAgentId
                                ? '詳細なパフォーマンス分析と管理アクション'
                                : 'すべてのエージェントの活動状況と成果をモニタリング'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-sm text-navy-secondary hover:border-navy-primary transition-all shadow-sm">
                            <Download size={16} />
                            レポート出力
                        </button>
                        {!selectedAgentId && (
                            <button className="flex items-center gap-2 px-6 py-3 bg-navy-primary text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all shadow-md">
                                <Filter size={16} />
                                詳細フィルタ
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                {selectedAgentId ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <button
                            onClick={() => setSelectedAgentId(null)}
                            className="flex items-center gap-2 text-xs font-black text-navy-primary hover:text-blue-600 transition-colors uppercase tracking-widest group"
                        >
                            <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                            エージェント一覧に戻る
                        </button>

                        <AgentInsights agentId={selectedAgentId} />
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <AgentPerformanceTable onSelectAgent={(id) => setSelectedAgentId(id)} />
                    </div>
                )}
            </div>
        </div>
    )
}
