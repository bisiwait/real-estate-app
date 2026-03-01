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
    const [users, setUsers] = useState<any[]>([])
    const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'expired'>('all')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const supabase = createClient()

    const fetchProperties = async () => {
        setLoading(true)
        setErrorMessage(null)
        const { data: propertiesData, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch properties error:', error)
            setErrorMessage(getErrorMessage(error))
        } else if (propertiesData) {
            // Fetch all users to populate the target user dropdown
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name')

            if (!profilesError && profilesData) {
                setUsers(profilesData)
                // Map profiles to properties
                const propertiesWithProfiles = propertiesData.map(property => {
                    const profile = profilesData.find(p => p.id === property.user_id)
                    return { ...property, profile }
                })
                setProperties(propertiesWithProfiles)
            } else {
                setProperties(propertiesData)
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProperties()
    }, [])

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'expire' | 'restore') => {
        if (action === 'delete') {
            if (!confirm('削除しますか？この処理をすると戻せません。')) return
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

    const handleAssignUser = async (id: string, newUserId: string) => {
        if (!confirm('担当者を変更しますか？')) return

        setLoading(true)
        try {
            const { error } = await supabase.from('properties').update({ user_id: newUserId || null }).eq('id', id)
            if (error) throw error
            await fetchProperties()
            setSelectedUsers(prev => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Assign user error:', err)
            setErrorMessage(getErrorMessage(err))
            setLoading(false)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setLoading(true)
        try {
            const updates: any = { status: newStatus }
            if (['published', 'under_negotiation', 'contracted'].includes(newStatus)) {
                updates.is_approved = true
            } else if (newStatus === 'draft') {
                updates.is_approved = false
            }
            const { error } = await supabase.from('properties').update(updates).eq('id', id)
            if (error) throw error
            await fetchProperties()
            setSelectedStatuses((prev: Record<string, string>) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        } catch (err: any) {
            console.error('Status change error:', err)
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
                                                <div className="flex gap-1 mt-1 mb-1">
                                                    {property.is_presale && (
                                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest border border-amber-200">
                                                            PRESALE
                                                        </span>
                                                    )}
                                                    {property.is_for_rent && (
                                                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest border border-indigo-100">
                                                            RENT
                                                        </span>
                                                    )}
                                                    {property.is_for_sale && (
                                                        <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest border border-orange-100">
                                                            SALE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col space-y-1 mt-1">
                                                    {property.is_for_rent && property.rent_price && (
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter w-fit">
                                                            Rent: {property.rent_price.toLocaleString()} THB
                                                        </span>
                                                    )}
                                                    {property.is_for_sale && property.sale_price && (
                                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-tighter w-fit">
                                                            Sale: {property.sale_price.toLocaleString()} THB
                                                        </span>
                                                    )}
                                                    {!property.is_for_rent && !property.is_for_sale && property.price && (
                                                        <span className="text-[10px] font-bold text-navy-primary bg-navy-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter w-fit">
                                                            {property.price.toLocaleString()} THB
                                                        </span>
                                                    )}
                                                    <Link href={`/properties/${property.id}`} target="_blank" className="text-slate-400 hover:text-navy-primary transition-colors flex items-center text-[10px] mt-1 font-bold">
                                                        <ExternalLink className="w-3 h-3 mr-1" /> 詳細を見る
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2">
                                            <select
                                                value={selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || '')}
                                                onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 w-full max-w-[130px] outline-none focus:ring-1 focus:ring-navy-primary"
                                            >
                                                <option value="">担当者を選択...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name || u.email || '名前未設定'}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                                disabled={selectedUsers[property.id] === undefined || selectedUsers[property.id] === (property.user_id || '')}
                                                className="px-2 py-1 bg-navy-primary text-white text-[10px] font-bold rounded hover:bg-navy-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                変更
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">ID: {property.user_id ? `${property.user_id.substring(0, 8)}...` : '未登録'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2">
                                            <select
                                                value={selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status}
                                                onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className={`text-xs font-bold rounded px-2 py-1.5 w-full max-w-[110px] outline-none focus:ring-1 focus:ring-navy-primary cursor-pointer transition-colors ${['published', 'under_negotiation', 'contracted'].includes(selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status)
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : (selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status) === 'pending'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <option value="draft">下書き</option>
                                                <option value="pending">承認待ち</option>
                                                <option value="published">公開中</option>
                                                <option value="under_negotiation">商談中</option>
                                                <option value="contracted">成約済</option>
                                                <option value="expired">期限切れ</option>
                                            </select>
                                            <button
                                                onClick={() => handleStatusChange(property.id, selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status)}
                                                disabled={selectedStatuses[property.id] === undefined || selectedStatuses[property.id] === property.status}
                                                className="px-2 py-1.5 bg-navy-primary text-white text-[10px] font-bold rounded hover:bg-navy-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                            >
                                                変更
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2">
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
