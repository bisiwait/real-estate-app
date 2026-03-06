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
            <div className="bg-slate-50 border-b border-slate-100 p-6 md:p-8 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-navy-secondary">デベロッパー・管理会社マスター</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Developer Management</p>
                </div>
                {!isAdding && !editingId && (
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="名前で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center space-x-2 bg-navy-primary text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-navy-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>新規登録</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="p-8">
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

                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">基本情報</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ウェブサイト</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedDevelopers.map((dev) => (
                                <tr key={dev.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                                                {dev.logo_url ? (
                                                    <img src={dev.logo_url} alt={dev.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Building2 className="w-5 h-5 text-slate-300" />
                                                )}
                                            </div>
                                            <span className="text-sm font-black text-navy-secondary">{dev.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 underline decoration-navy-primary/30">
                                        {dev.website_url ? (
                                            <a href={dev.website_url} target="_blank" className="text-xs font-bold text-navy-primary flex items-center">
                                                <Globe className="w-3 h-3 mr-1" />
                                                公式サイト
                                            </a>
                                        ) : '--'}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => handleEdit(dev)} className="p-2 bg-slate-100 rounded-lg hover:bg-navy-primary hover:text-white transition-all">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(dev.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
