'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Check,
    X,
    Trash2,
    ExternalLink,
    Clock,
    AlertCircle,
    Loader2,
    EyeOff,
    RotateCcw
} from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'


export default function AdminPropertyManagement() {
    const [properties, setProperties] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'expired'>('all')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const supabase = createClient()

    const fetchProperties = async () => {
        setLoading(true)
        setErrorMessage(null)
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch properties error:', error)
            setErrorMessage(getErrorMessage(error))
        } else if (data) {

            setProperties(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProperties()
    }, [])

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'expire' | 'restore') => {
        if (action === 'delete') {
            if (!confirm('この物件を完全に削除しますか？')) return
        }

        setLoading(true)
        try {
            if (action === 'approve') {
                await supabase.from('properties').update({ is_approved: true, status: 'published' }).eq('id', id)
            } else if (action === 'restore') {
                // "Restore" action: set back to published and ensure approved
                await supabase.from('properties').update({ is_approved: true, status: 'published' }).eq('id', id)
            } else if (action === 'reject') {
                // "Hide" action: set to draft and unapprove
                await supabase.from('properties').update({ is_approved: false, status: 'draft' }).eq('id', id)
            } else if (action === 'expire') {
                // "Expire" action: keep approved but set status to expired
                await supabase.from('properties').update({ status: 'expired' }).eq('id', id)
            } else if (action === 'delete') {
                await supabase.from('properties').delete().eq('id', id)
            }
            await fetchProperties()
        } catch (err: any) {
            console.error('Admin action error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {

            setLoading(false)
        }
    }

    const filteredProperties = properties.filter(p => {
        if (filter === 'pending') return !p.is_approved || p.status === 'pending'
        if (filter === 'active') return p.is_approved && p.status === 'published'
        if (filter === 'expired') return p.status === 'expired'
        return true
    })

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-navy-secondary">物件承認・管理</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Property Management</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${filter === 'all' ? 'bg-navy-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        すべて表示
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                    >
                        承認待ち
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${filter === 'active' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                        公開中
                    </button>
                    <button
                        onClick={() => setFilter('expired')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${filter === 'expired' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                        期限切れ
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">物件情報</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">投稿者</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {errorMessage && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 bg-red-50 text-red-600 text-xs font-bold text-center">
                                    エラーが発生しました: {errorMessage}
                                </td>
                            </tr>
                        )}
                        {loading && properties.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center">
                                    <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium font-bold">読み込み中...</p>
                                </td>
                            </tr>
                        ) : filteredProperties.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center font-bold text-slate-300">
                                    表示する物件はありません
                                </td>
                            </tr>
                        ) : (
                            filteredProperties.map((property) => (
                                <tr key={property.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-4">
                                            {property.images?.[0] ? (
                                                <img src={property.images[0]} className="w-12 h-12 rounded-lg object-cover shadow-sm" alt="" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                                    <AlertCircle className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-black text-navy-secondary line-clamp-1">{property.title}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className="text-[10px] font-bold text-navy-primary bg-navy-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                        {property.price?.toLocaleString()} THB
                                                    </span>
                                                    <Link href={`/properties/${property.id}`} target="_blank" className="text-slate-400 hover:text-navy-primary transition-colors">
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs font-bold text-slate-600">ID: {property.user_id?.substring(0, 8)}...</p>
                                        <p className="text-[10px] text-slate-400">詳細情報取得中</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        {!property.is_approved || property.status === 'pending' ? (
                                            <span className="flex items-center text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 px-2 py-1 rounded">
                                                <Clock className="w-3 h-3 mr-1.5" /> 承認待ち
                                            </span>
                                        ) : property.status === 'published' ? (
                                            <span className="flex items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
                                                <Check className="w-3 h-3 mr-1.5" /> 公開中
                                            </span>
                                        ) : property.status === 'draft' ? (
                                            <span className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                                                <AlertCircle className="w-3 h-3 mr-1.5" /> 下書き
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-50 px-2 py-1 rounded">
                                                <AlertCircle className="w-3 h-3 mr-1.5" /> 期限切れ
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {!property.is_approved && (
                                                <button
                                                    onClick={() => handleAction(property.id, 'approve')}
                                                    className="flex items-center space-x-1 px-3 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                                                    title="承認して公開"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    <span>承認・公開</span>
                                                </button>
                                            )}
                                            {property.is_approved && property.status === 'published' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(property.id, 'reject')}
                                                        className="flex items-center space-x-1 px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-all"
                                                        title="非表示にする（下書きへ）"
                                                    >
                                                        <EyeOff className="w-3 h-3" />
                                                        <span>非表示</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(property.id, 'expire')}
                                                        className="flex items-center space-x-1 px-3 py-2 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg hover:bg-amber-100 transition-all"
                                                        title="期限切れにする"
                                                    >
                                                        <Clock className="w-3 h-3" />
                                                        <span>期限切れ</span>
                                                    </button>
                                                </>
                                            )}
                                            {property.status === 'expired' && (
                                                <button
                                                    onClick={() => handleAction(property.id, 'restore')}
                                                    className="flex items-center space-x-1 px-3 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg hover:bg-emerald-100 transition-all font-bold"
                                                    title="この物件を復活（再公開）させる"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>復活させる</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAction(property.id, 'delete')}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                title="削除する"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
