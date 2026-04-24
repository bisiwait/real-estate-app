'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { escapeIlikePattern, maxPageForCount } from '@/lib/admin-list-url'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import AdminRowsPerPageSelect from '@/components/admin/AdminRowsPerPageSelect'
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
import PropertyThumbnail from '@/components/property/PropertyThumbnail'


export default function AdminPropertyManagement() {
    const [properties, setProperties] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
    const [selectedStatuses, setSelectedStatuses] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'draft'>('all')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [totalCount, setTotalCount] = useState<number | null>(null)
    const supabase = createClient()
    const { limit, page, setPage, setLimit } = useAdminTablePagination()

    const agentIdSet = useMemo(() => new Set(users.map((u) => u.id)), [users])

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => window.clearTimeout(t)
    }, [searchQuery])

    const prevFilterRef = useRef(filter)
    useEffect(() => {
        if (prevFilterRef.current !== filter) {
            prevFilterRef.current = filter
            if (page !== 1) setPage(1)
        }
    }, [filter, page, setPage])

    const prevDebouncedRef = useRef(debouncedSearch)
    useEffect(() => {
        if (prevDebouncedRef.current !== debouncedSearch) {
            prevDebouncedRef.current = debouncedSearch
            if (page !== 1) setPage(1)
        }
    }, [debouncedSearch, page, setPage])

    const fetchAgentProfiles = useCallback(async () => {
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('user_role', 'agent')
            .is('deleted_at', null)
            .order('full_name')

        if (!profilesError && profilesData) {
            setUsers(profilesData)
        }
    }, [supabase])

    const fetchPropertiesPage = useCallback(async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            let q = supabase
                .from('properties')
                .select(
                    '*, profile:profiles!properties_user_id_fkey(id, full_name, email)',
                    { count: 'exact', head: false }
                )
                .order('created_at', { ascending: false })

            if (filter === 'pending') {
                q = q.or('is_approved.eq.false,is_approved.is.null,status.eq.pending')
            } else if (filter === 'active') {
                q = q.eq('is_approved', true).eq('status', 'published')
            } else if (filter === 'draft') {
                q = q.eq('status', 'draft')
            }

            const trimmed = debouncedSearch.trim().replace(/,/g, '')
            if (trimmed) {
                const pattern = `%${escapeIlikePattern(trimmed)}%`
                const { data: profMatches } = await supabase
                    .from('profiles')
                    .select('id')
                    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
                const ids = (profMatches ?? []).map((r) => r.id).filter(Boolean)
                if (ids.length > 0) {
                    q = q.or(`title.ilike.${pattern},user_id.in.(${ids.join(',')})`)
                } else {
                    q = q.ilike('title', pattern)
                }
            }

            const from = (page - 1) * limit
            const to = from + limit - 1
            const { data: rows, error, count } = await q.range(from, to)

            if (error) {
                console.error('Fetch properties error:', error)
                setErrorMessage(getErrorMessage(error))
                setProperties([])
                setTotalCount(0)
                return
            }

            const list = rows ?? []
            const normalized = list.map((property: any) => {
                const embedded = property.profile
                const profile = Array.isArray(embedded) ? embedded[0] : embedded
                const { profile: _p, ...rest } = property
                return { ...rest, profile }
            })
            setProperties(normalized)
            setTotalCount(typeof count === 'number' ? count : normalized.length)
        } finally {
            setLoading(false)
        }
    }, [supabase, filter, debouncedSearch, page, limit])

    useEffect(() => {
        void fetchAgentProfiles()
    }, [fetchAgentProfiles])

    useEffect(() => {
        void fetchPropertiesPage()
    }, [fetchPropertiesPage])

    useEffect(() => {
        if (totalCount === null) return
        const maxP = maxPageForCount(totalCount, limit)
        if (page > maxP) setPage(maxP)
    }, [totalCount, limit, page, setPage])

    const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete' | 'restore') => {
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
            } else if (action === 'delete') {
                await supabase.from('properties').delete().eq('id', id)
            }
            await fetchPropertiesPage()
        } catch (err: any) {
            console.error('Admin action error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {

            setLoading(false)
        }
    }

    const handleAssignUser = async (id: string, newUserId: string) => {
        if (!confirm('掲載エージェントを変更しますか？')) return

        setLoading(true)
        try {
            const { error } = await supabase.from('properties').update({ user_id: newUserId || null }).eq('id', id)
            if (error) throw error
            await fetchPropertiesPage()
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
            if (newStatus === 'published') {
                updates.is_approved = true
            } else if (newStatus === 'draft') {
                updates.is_approved = false
            }
            const { error } = await supabase.from('properties').update(updates).eq('id', id)
            if (error) throw error
            await fetchPropertiesPage()
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

    const totalPages =
        totalCount !== null && totalCount > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1
    const fromRow = totalCount === 0 ? 0 : (page - 1) * limit + 1
    const toRow = totalCount === null ? 0 : Math.min(page * limit, totalCount)

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-2 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg md:text-xl font-black text-navy-secondary">物件承認・管理</h2>
                        {!loading && totalCount !== null && (
                            <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold">
                                {totalCount}件
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Property Management</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
                    <AdminRowsPerPageSelect
                        id="admin-properties-limit"
                        value={limit}
                        onChange={setLimit}
                        className="order-last md:order-none"
                    />
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="物件名・エージェント名で検索..."
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
                                onClick={() => setFilter('draft')}
                                className={`flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${filter === 'draft' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                下書き
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-2 md:p-8">
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
                ) : !loading && totalCount === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Filter className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="font-bold">表示する物件がありません</p>
                    </div>
                ) : (
                    properties.map((property) => {
                        const currentStatus = selectedStatuses[property.id] !== undefined ? selectedStatuses[property.id] : property.status
                        return (
                            <div key={property.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors">
                                {/* Mobile & Desktop unified layout */}
                                <div className="flex gap-3 md:gap-4">
                                    {/* Image */}
                                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                                        {property.images?.[0] ? (
                                            <PropertyThumbnail
                                                src={property.images[0]}
                                                alt=""
                                                fill
                                                sizes="(max-width: 767px) 64px, 80px"
                                                className="object-cover"
                                            />
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
                                                value={
                                                    selectedUsers[property.id] !== undefined
                                                        ? selectedUsers[property.id]
                                                        : agentIdSet.has(property.user_id || '')
                                                          ? (property.user_id || '')
                                                          : ''
                                                }
                                                onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-navy-primary max-w-[120px]"
                                            >
                                                <option value="">エージェントを選択...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                                disabled={
                                                    selectedUsers[property.id] === undefined ||
                                                    selectedUsers[property.id] === (property.user_id || '') ||
                                                    selectedUsers[property.id] === ''
                                                }
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
                                            value={
                                                selectedUsers[property.id] !== undefined
                                                    ? selectedUsers[property.id]
                                                    : agentIdSet.has(property.user_id || '')
                                                      ? (property.user_id || '')
                                                      : ''
                                            }
                                            onChange={(e) => setSelectedUsers(prev => ({ ...prev, [property.id]: e.target.value }))}
                                            className="flex-1 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="">エージェントを選択...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email || '未設定'}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssignUser(property.id, selectedUsers[property.id] !== undefined ? selectedUsers[property.id] : (property.user_id || ''))}
                                            disabled={
                                                selectedUsers[property.id] === undefined ||
                                                selectedUsers[property.id] === (property.user_id || '') ||
                                                selectedUsers[property.id] === ''
                                            }
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
            {!loading && totalCount !== null && totalCount > 0 && totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span className="text-xs font-bold text-slate-400">
                        全 {totalCount} 件中 {fromRow} - {toRow} 件を表示
                    </span>
                    <div className="flex space-x-1">
                        <button
                            type="button"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => {
                            if (
                                i === 0 ||
                                i === totalPages - 1 ||
                                Math.abs(i + 1 - page) <= 1
                            ) {
                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${page === i + 1
                                            ? 'bg-navy-primary text-white border border-navy-primary'
                                            : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            } else if (
                                Math.abs(i + 1 - page) === 2
                            ) {
                                return <span key={i} className="px-1 py-1.5 text-slate-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            type="button"
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
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
