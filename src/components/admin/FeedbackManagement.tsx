'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Lightbulb, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    User, 
    Calendar,
    ChevronDown,
    ChevronUp,
    Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function AdminFeedbackManagement() {
    const [feedbacks, setFeedbacks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const supabase = createClient()

    useEffect(() => {
        fetchFeedbacks()
    }, [statusFilter])

    const fetchFeedbacks = async () => {
        setLoading(true)
        let query = supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const { data, error } = await query
        if (error) {
            console.error('Error fetching feedbacks:', error)
        } else {
            setFeedbacks(data || [])
        }
        setLoading(false)
    }

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('feedback')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            console.error('Error updating status:', error)
        } else {
            setFeedbacks(feedbacks.map(f => f.id === id ? { ...f, status: newStatus } : f))
        }
    }

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'high':
                return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">High</span>
            case 'medium':
                return <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Medium</span>
            default:
                return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Low</span>
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 対応済</span>
            case 'in_progress':
                return <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> 進行中</span>
            default:
                return <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 未対応</span>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-200">
                        <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-navy-secondary">要望・改善提案一覧</h2>
                        <p className="text-slate-400 text-sm font-medium">ユーザーから届いたフィードバックを管理します</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm font-bold text-slate-600 bg-transparent focus:outline-none pr-4"
                    >
                        <option value="all">すべて表示</option>
                        <option value="new">未対応</option>
                        <option value="in_progress">進行中</option>
                        <option value="completed">対応済</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-3xl p-20 shadow-xl border border-slate-100 flex flex-col items-center justify-center space-y-4">
                    <Clock className="w-10 h-10 text-navy-primary/20 animate-spin" />
                    <p className="text-slate-400 font-bold">読み込み中...</p>
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 shadow-xl border border-slate-100 text-center">
                    <p className="text-slate-400 font-bold text-lg">現在、要望はありません</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {feedbacks.map((item) => (
                        <div 
                            key={item.id} 
                            className={cn(
                                "bg-white rounded-3xl border transition-all overflow-hidden",
                                expandedId === item.id ? "shadow-2xl border-navy-primary/20" : "shadow-md border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div 
                                className="p-6 cursor-pointer flex items-center justify-between gap-4"
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {getStatusBadge(item.status)}
                                        {getPriorityBadge(item.priority)}
                                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm')}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-navy-secondary truncate">{item.title}</h3>
                                </div>
                                
                                <div className="shrink-0 flex items-center gap-4">
                                    <div className="hidden md:flex flex-col items-end">
                                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                            <User className="w-3 h-3" />
                                            ID: {item.user_id?.slice(0, 8)}
                                        </div>
                                    </div>
                                    {expandedId === item.id ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                                </div>
                            </div>

                            {expandedId === item.id && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                                    <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                            {item.content}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">ステータス変更:</span>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'new')}
                                                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", item.status === 'new' ? "bg-rose-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                            >
                                                未対応
                                            </button>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'in_progress')}
                                                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", item.status === 'in_progress' ? "bg-blue-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                            >
                                                進行中
                                            </button>
                                            <button 
                                                onClick={() => updateStatus(item.id, 'completed')}
                                                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", item.status === 'completed' ? "bg-emerald-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                            >
                                                対応済
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
