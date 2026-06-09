'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
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

export default function AdminFeedbackManagement({
    onConsumeNewFeedbackBadge,
}: {
    /** 未対応（new）を「見た」扱いにしたときバッジを1減らす（同一IDは1回のみ） */
    onConsumeNewFeedbackBadge?: (feedbackId: string) => void
}) {
    const [feedbacks, setFeedbacks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')

    useEffect(() => {
        void fetchFeedbacks()
    }, [statusFilter])

    const fetchFeedbacks = async () => {
        setLoading(true)
        try {
            const qs = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''
            const res = await fetch(`/api/admin/feedback${qs}`)
            const data = (await res.json().catch(() => ({}))) as { feedbacks?: unknown[]; error?: string }
            if (!res.ok) {
                console.error('Error fetching feedbacks:', data.error)
                setFeedbacks([])
            } else {
                setFeedbacks(data.feedbacks || [])
            }
        } catch (e) {
            console.error('Error fetching feedbacks:', e)
            setFeedbacks([])
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        const prevStatus = feedbacks.find((f) => f.id === id)?.status
        try {
            const res = await fetch('/api/admin/feedback-status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }

            if (!res.ok) {
                toast.error(data.error || 'ステータスの更新に失敗しました')
                return
            }

            setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f)))
            if (prevStatus === 'new' && newStatus !== 'new') {
                onConsumeNewFeedbackBadge?.(id)
            }
            toast.success('ステータスを保存しました')
        } catch (e) {
            console.error('Error updating status:', e)
            toast.error('ステータスの更新に失敗しました')
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
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-2 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg md:text-xl font-black text-navy-secondary">要望・改善提案一覧</h2>
                        {!loading && (
                            <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
                                {feedbacks.length}件
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Feedback Management</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 md:flex-none text-[11px] md:text-xs font-bold text-slate-600 bg-transparent focus:outline-none pr-4 py-1"
                    >
                        <option value="all">すべて表示</option>
                        <option value="new">未対応</option>
                        <option value="in_progress">進行中</option>
                        <option value="completed">対応済</option>
                    </select>
                </div>
            </div>

            <div className="p-2 md:p-8">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Clock className="w-10 h-10 text-navy-primary/20 animate-spin mb-4" />
                        <p className="font-bold">読み込み中...</p>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Lightbulb className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">現在、要望はありません</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {feedbacks.map((item) => (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "bg-white rounded-2xl border transition-all overflow-hidden",
                                    expandedId === item.id ? "shadow-lg border-navy-primary/20" : "shadow-sm border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <div 
                                    className="p-4 md:p-6 cursor-pointer flex items-center justify-between gap-4"
                                    onClick={() => {
                                        if (expandedId === item.id) {
                                            setExpandedId(null)
                                            return
                                        }
                                        setExpandedId(item.id)
                                        if (item.status === 'new') {
                                            onConsumeNewFeedbackBadge?.(item.id)
                                        }
                                    }}
                                >
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getStatusBadge(item.status)}
                                            {getPriorityBadge(item.priority)}
                                            <span className="text-[9px] md:text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(item.created_at), 'yyyy/MM/dd HH:mm')}
                                            </span>
                                        </div>
                                        <h3 className="text-sm md:text-lg font-black text-navy-secondary truncate">{item.title}</h3>
                                    </div>
                                    
                                    <div className="shrink-0 flex items-center gap-4">
                                        <div className="hidden md:flex flex-col items-end">
                                            <div className="flex items-center gap-1 text-xs font-bold text-navy-primary">
                                                <User className="w-3 h-3" />
                                                {item.profile?.full_name || '名前未設定'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {item.profile?.email || 'メール不明'}
                                            </div>
                                        </div>
                                        {expandedId === item.id ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                                    </div>
                                </div>

                                {expandedId === item.id && (
                                    <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
                                            <div className="md:hidden mb-3 pb-3 border-b border-slate-200/50">
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-navy-primary">
                                                    <User className="w-3 h-3" />
                                                    {item.profile?.full_name || '名前未設定'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    {item.profile?.email || 'メール不明'}
                                                </div>
                                            </div>
                                            <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                                {item.content}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                                <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mr-1 md:mr-2 whitespace-nowrap">ステータス変更:</span>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void updateStatus(item.id, 'new')
                                                    }}
                                                    className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap", item.status === 'new' ? "bg-rose-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                                >
                                                    未対応
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void updateStatus(item.id, 'in_progress')
                                                    }}
                                                    className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap", item.status === 'in_progress' ? "bg-blue-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                                                >
                                                    進行中
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        void updateStatus(item.id, 'completed')
                                                    }}
                                                    className={cn("px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap", item.status === 'completed' ? "bg-emerald-500 text-white shadow-md" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
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
        </div>
    );
}
