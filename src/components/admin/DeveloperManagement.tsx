'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Loader2,
    Building2,
    Globe,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import Image from 'next/image'

interface Developer {
    id: string
    name: string
    logo_url: string | null
    description: string | null
    website_url: string | null
    created_at: string
}

export default function AdminDeveloperManagement() {
    const [developers, setDevelopers] = useState<Developer[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Search & Pagination
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const [formData, setFormData] = useState<Partial<Developer>>({
        name: '',
        logo_url: '',
        description: '',
        website_url: ''
    })

    const supabase = createClient()

    const fetchDevelopers = async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            const { data, error } = await supabase
                .from('developers')
                .select('*')
                .order('name')

            if (error) throw error
            setDevelopers(data || [])
        } catch (err: any) {
            console.error('Fetch error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDevelopers()
    }, [])

    const filteredDevelopers = developers.filter(dev =>
        dev.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredDevelopers.length / itemsPerPage)
    const paginatedDevelopers = filteredDevelopers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleEdit = (developer: Developer) => {
        setEditingId(developer.id)
        setFormData(developer)
        setIsAdding(false)
    }

    const handleCancel = () => {
        setEditingId(null)
        setIsAdding(false)
        setFormData({
            name: '',
            logo_url: '',
            description: '',
            website_url: ''
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage(null)

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('developers')
                    .update({
                        name: formData.name,
                        logo_url: formData.logo_url,
                        description: formData.description,
                        website_url: formData.website_url
                    })
                    .eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('developers')
                    .insert([formData])
                if (error) throw error
            }

            handleCancel()
            await fetchDevelopers()
        } catch (err: any) {
            console.error('Submit error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('削除しますか？')) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('developers')
                .delete()
                .eq('id', id)
            if (error) throw error
            await fetchDevelopers()
        } catch (err: any) {
            setErrorMessage('削除できませんでした。このデベロッパーに紐づくプロジェクトが存在する可能性があります。')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mb-12">
            <div className="bg-slate-50 border-b border-slate-100 p-2 md:p-8">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2 md:gap-3">
                        <h2 className="min-w-0 whitespace-nowrap text-base font-black text-navy-secondary md:text-xl">
                            デベロッパーマスター<span className="hidden md:inline">・管理会社マスター</span>
                        </h2>
                        {!loading && (
                            <span className="shrink-0 rounded-full bg-navy-primary/10 px-2.5 py-1 text-[11px] font-bold text-navy-primary md:px-3 md:text-xs">
                                {filteredDevelopers.length}件
                            </span>
                        )}
                    </div>
                    <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 md:block">Developer Management</p>
                </div>
                {!isAdding && !editingId && (
                    <div className="mt-3 flex items-center gap-2 md:mt-4 md:flex-wrap md:gap-4">
                        <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 md:h-4 md:w-4" />
                            <input
                                type="text"
                                placeholder="名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-[11px] font-bold text-navy-secondary transition-all focus:outline-none focus:ring-2 focus:ring-navy-primary/20 md:pl-9 md:pr-4 md:text-xs"
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
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex shrink-0 items-center justify-center space-x-1 rounded-xl bg-navy-primary px-3 py-2 text-[11px] font-black text-white shadow-lg shadow-navy-primary/20 transition-all hover:bg-navy-secondary md:space-x-2 md:px-6 md:py-2.5 md:text-xs"
                        >
                            <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span>新規登録</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="p-2 md:p-8">
                {errorMessage && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-xs font-bold mb-6">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {(isAdding || editingId) && (
                    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl p-8 border border-navy-primary/10 space-y-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-navy-primary uppercase tracking-widest">
                                {editingId ? 'デベロッパー編集' : '新規デベロッパー登録'}
                            </h3>
                            <button type="button" onClick={handleCancel} className="text-[10px] font-bold text-slate-400">キャンセル</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">名前 <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary"
                                    placeholder="Sansiri"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ロゴURL</label>
                                <input
                                    type="text"
                                    value={formData.logo_url || ''}
                                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ウェブサイトURL</label>
                            <input
                                type="text"
                                value={formData.website_url || ''}
                                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">説明</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary min-h-[100px]"
                                placeholder="会社概要など"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                disabled={loading}
                                type="submit"
                                className="bg-navy-primary text-white px-10 py-4 rounded-2xl font-black flex items-center space-x-2 hover:bg-navy-secondary transition-all"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /><span>保存する</span></>}
                            </button>
                        </div>
                    </form>
                )}

                <div className="divide-y divide-slate-100">
                    {loading && developers.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mb-4" />
                            <p className="font-bold">読み込み中...</p>
                        </div>
                    ) : paginatedDevelopers.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                            <Building2 className="w-10 h-10 mb-4" />
                            <p className="font-bold">デベロッパーが見つかりません</p>
                        </div>
                    ) : (
                        paginatedDevelopers.map((dev) => (
                            <div key={dev.id} className="p-4 md:p-5 hover:bg-slate-50/50 transition-colors flex items-center gap-3 md:gap-4">
                                {/* Logo */}
                                <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 md:h-14 md:w-14">
                                    {dev.logo_url ? (
                                        <Image
                                            src={dev.logo_url}
                                            alt={dev.name}
                                            fill
                                            sizes="(max-width: 767px) 48px, 56px"
                                            className="object-contain p-1"
                                        />
                                    ) : (
                                        <Building2 className="w-6 h-6 text-slate-300" />
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-navy-secondary">{dev.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {dev.website_url ? (
                                            <a href={dev.website_url} target="_blank" className="text-[10px] font-bold text-navy-primary flex items-center gap-0.5 hover:underline">
                                                <Globe className="w-3 h-3" />公式サイト
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">サイトなし</span>
                                        )}
                                        {dev.description && (
                                            <span className="text-[10px] text-slate-400 truncate hidden md:block max-w-xs">{dev.description}</span>
                                        )}
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => handleEdit(dev)} className="p-2 md:p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-navy-primary hover:text-white transition-all" title="編集">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(dev.id)} className="p-2 md:p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="削除">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 mt-2">
                        <span className="text-xs font-bold text-slate-400">
                            全 {filteredDevelopers.length} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredDevelopers.length)} 件を表示
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
        </div>
    )
}
