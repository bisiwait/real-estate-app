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
    RotateCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter
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

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

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
        // Tab Filter
        let tabMatch = true;
        if (filter === 'pending') tabMatch = !p.is_approved || p.status === 'pending'
        else if (filter === 'active') tabMatch = p.is_approved && p.status === 'published'
        else if (filter === 'expired') tabMatch = p.status === 'expired'

        // Search Query Match
        let searchMatch = true;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = (p.title || '').toLowerCase().includes(query);
            const userMatch = (p.profile?.full_name || p.profile?.email || '').toLowerCase().includes(query);
            searchMatch = titleMatch || userMatch;
        }

        return tabMatch && searchMatch;
    })

    // Pagination logic
    const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
    const paginatedProperties = filteredProperties.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filter]);

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg md:text-xl font-black text-navy-secondary">物件承認・管理</h2>
                        {!loading && (
                            <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
                                {filteredProperties.length}件
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Property Management</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="物件名・担当者で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] md:text-xs font-bold text-navy-secondary focus:outline-none focus:ring-2 focus:ring-navy-primary/20 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center w-full md:w-auto overflow-hidden">
                        <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-full md:w-auto">
                            <button
                                onClick={() => setFilter('all')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-navy-primary text-white shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                            >
                                すべて
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${filter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-500'}`}
                            >
                                承認待ち
                            </button>
                            <button
                                onClick={() => setFilter('active')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${filter === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-500'}`}
                            >
                                公開中
                            </button>
                            <button
                                onClick={() => setFilter('expired')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${filter === 'expired' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
                            >
                                期限切れ
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                {errorMessage && (
                    <div className="px-4 py-3 bg-red-50 text-red-600 text-xs font-bold text-center">
                        エラーが発生しました: {errorMessage}
                    </div>
                )}
                {loading && properties.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mb-4" />
                        <p className="font-bold">読み込み中...</p>
                    </div>
                ) : filteredProperties.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Filter className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">表示する物件がありません</p>
                    </div>
                ) : (
                    paginatedProperties.map((property) => {
                        const currentStatus = selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status
                        return (
                            <div key={property.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                                {/* Mobile & Desktop unified layout */}
                                <div className="flex gap-3 md:gap-4">
                                    {/* Image */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                                        {property.images?.[0] ? (
                                            <img src={property.images[0]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                            {property.is_presale && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-amber-200">PRESALE</span>}
                                            {property.is_for_rent && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-indigo-100">RENT</span>}
                                            {property.is_for_sale && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-orange-100">SALE</span>}
                                            {/* Status badge */}
                                            {property.status === 'published' && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black">公開中</span>}
                                            {property.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black">承認待ち</span>}
                                            {property.status === 'draft' && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">下書き</span>}
                                            {property.status === 'expired' && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black">期限切れ</span>}
                                            {property.status === 'under_negotiation' && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black">商談中</span>}
                                            {property.status === 'contracted' && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[8px] font-black">成約済</span>}
                                        </div>
                                        <p className="text-sm font-black text-navy-secondary truncate">{property.title}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {property.is_for_rent && property.rent_price && (
                                                <span className="text-[10px] font-bold text-indigo-600">{property.rent_price.toLocaleString()} ฿/月</span>
                                            )}
                                            {property.is_for_sale && property.sale_price && (
                                                <span className="text-[10px] font-bold text-orange-600">{property.sale_price.toLocaleString()} ฿</span>
                                            )}
                                            <span className="text-[10px] text-slate-400">{property.profile?.full_name || property.profile?.email || '未割当'}</span>
                                        </div>
                                    </div>
                                    {/* Actions - Desktop */}
                                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || '')}
                                                onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-navy-primary max-w-[120px]"
                                            >
                                                <option value="">担当者...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                                disabled={selectedUsers[property.id] === undefined || selectedUsers[property.id] === (property.user_id || '')}
                                                className="px-2 py-1.5 bg-slate-100 text-navy-primary text-[10px] font-bold rounded-lg hover:bg-navy-primary hover:text-white transition-all disabled:opacity-30"
                                            >変更</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={currentStatus}
                                                onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none border bg-white max-w-[100px]"
                                            >
                                                <option value="draft">下書き</option>
                                                <option value="pending">承認待ち</option>
                                                <option value="published">公開中</option>
                                                <option value="under_negotiation">商談中</option>
                                                <option value="contracted">成約済</option>
                                                <option value="expired">期限切れ</option>
                                            </select>
                                            <button
                                                onClick={() => handleStatusChange(property.id, currentStatus)}
                                                disabled={selectedStatuses[property.id] === undefined || selectedStatuses[property.id] === property.status}
                                                className="px-2 py-1.5 bg-navy-primary text-white text-[10px] font-bold rounded-lg hover:bg-navy-secondary transition-all disabled:opacity-30"
                                            >変更</button>
                                        </div>
                                        <Link href={`/properties/${property.id}`} target="_blank" className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all" title="詳細">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => handleAction(property.id, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="削除">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Actions - Mobile */}
                                <div className="md:hidden mt-3 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || '')}
                                            onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="">担当者...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                            disabled={selectedUsers[property.id] === undefined || selectedUsers[property.id] === (property.user_id || '')}
                                            className="px-3 py-2 bg-navy-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-30"
                                        >変更</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={currentStatus}
                                            onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [property.id]: e.target.value }))}
                                            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="draft">下書き</option>
                                            <option value="pending">承認待ち</option>
                                            <option value="published">公開中</option>
                                            <option value="under_negotiation">商談中</option>
                                            <option value="contracted">成約済</option>
                                            <option value="expired">期限切れ</option>
                                        </select>
                                        <button
                                            onClick={() => handleStatusChange(property.id, currentStatus)}
                                            disabled={selectedStatuses[property.id] === undefined || selectedStatuses[property.id] === property.status}
                                            className="px-3 py-2 bg-navy-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-30"
                                        >変更</button>
                                        <Link href={`/properties/${property.id}`} target="_blank" className="p-2 rounded-lg bg-slate-50 text-slate-500">
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button onClick={() => handleAction(property.id, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-white">
                    <span className="text-xs font-bold text-slate-400">
                        全 {filteredProperties.length} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProperties.length)} 件を表示
                    </span>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                            // Show first, last, current, and adjacent pages
                            if (
                                i === 0 ||
                                i === totalPages - 1 ||
                                Math.abs(i + 1 - currentPage) <= 1
                            ) {
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${currentPage === i + 1
                                            ? 'bg-navy-primary text-white border border-navy-primary'
                                            : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            } else if (
                                Math.abs(i + 1 - currentPage) === 2
                            ) {
                                return <span key={i} className="px-1 py-1.5 text-slate-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
