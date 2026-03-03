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
    MapPin,
    Calendar,
    Layers,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import dynamic from 'next/dynamic'

const CoordinatePicker = dynamic(() => import('../property/CoordinatePicker'), {
    loading: () => <div className="bg-slate-50 rounded-2xl h-64 animate-pulse border border-slate-100" />,
    ssr: false
})

interface Area {
    id: string
    name: string
    region?: { name: string }
}

interface Project {
    id: string
    name: string
    area_id: string
    property_type: string
    year_built: string
    total_floors: number | null
    address: string
    image_url: string
    latitude: number | null
    longitude: number | null
}

export default function AdminProjectManagement() {
    const [projects, setProjects] = useState<Project[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Search & Pagination & Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [filterMissingInfo, setFilterMissingInfo] = useState(false)
    const itemsPerPage = 10

    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        area_id: '',
        property_type: 'Condo',
        year_built: '',
        total_floors: null,
        address: '',
        image_url: '',
        latitude: 12.9236,
        longitude: 100.8824
    })

    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            const [projectsRes, areasRes] = await Promise.all([
                supabase.from('projects').select('*').order('name'),
                supabase.from('areas').select('id, name, region:regions(name)').order('name')
            ])

            if (projectsRes.error) throw projectsRes.error
            if (areasRes.error) throw areasRes.error

            setProjects(projectsRes.data || [])
            if (areasRes.data) {
                const mappedAreas = areasRes.data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    region: item.region || { name: '' }
                }))

                // Sort areas: Pattaya first, then Sriracha, then alphabetical inside
                mappedAreas.sort((a: Area, b: Area) => {
                    const regionA = a.region?.name || ''
                    const regionB = b.region?.name || ''

                    if (regionA === 'Pattaya' && regionB !== 'Pattaya') return -1
                    if (regionA !== 'Pattaya' && regionB === 'Pattaya') return 1

                    if (regionA === 'Sriracha' && regionB !== 'Sriracha') return -1
                    if (regionA !== 'Sriracha' && regionB === 'Sriracha') return 1

                    if (regionA !== regionB) return regionA.localeCompare(regionB)
                    return a.name.localeCompare(b.name)
                })

                setAreas(mappedAreas)
            } else {
                setAreas([])
            }
        } catch (err: any) {
            console.error('Fetch error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Filter projects based on search query and missing info filter
    const filteredProjects = projects.filter(project => {
        // Missing Info Filter logic: IF filter is ON, project MUST be missing year_built OR total_floors
        if (filterMissingInfo) {
            const hasMissingInfo = !project.year_built || !project.total_floors;
            if (!hasMissingInfo) return false;
        }

        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            project.name.toLowerCase().includes(query) ||
            (areas.find(a => a.id === project.area_id)?.name || '').toLowerCase().includes(query)
        );
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = filteredProjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handleEdit = (project: Project) => {
        setEditingId(project.id)
        setFormData(project)
        setIsAdding(false)
    }

    const handleCancel = () => {
        setEditingId(null)
        setIsAdding(false)
        setFormData({
            name: '',
            area_id: '',
            property_type: 'Condo',
            year_built: '',
            total_floors: null,
            address: '',
            image_url: '',
            latitude: 12.9236,
            longitude: 100.8824
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage(null)

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('projects')
                    .update({
                        name: formData.name,
                        area_id: formData.area_id,
                        property_type: formData.property_type,
                        year_built: formData.year_built,
                        total_floors: formData.total_floors,
                        address: formData.address,
                        image_url: formData.image_url,
                        latitude: formData.latitude,
                        longitude: formData.longitude
                    })
                    .eq('id', editingId)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('projects')
                    .insert([formData])

                if (error) throw error
            }

            handleCancel()
            await fetchData()
        } catch (err: any) {
            console.error('Submit error:', err)
            setErrorMessage(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('削除しますか？この処理をすると戻せません。')) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id)

            if (error) throw error
            await fetchData()
        } catch (err: any) {
            console.error('Delete error:', err)
            setErrorMessage('削除できませんでした。このプロジェクトに紐づく物件が既に存在している可能性があります。')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mb-12">
            <div className="bg-slate-50 border-b border-slate-100 p-6 md:p-8 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-navy-secondary">プロジェクト情報管理（建物マスター）</h2>
                        {!loading && (
                            <span className="bg-navy-primary/10 text-navy-primary px-3 py-1 rounded-full text-xs font-bold">
                                {filteredProjects.length}件
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Project Master Management</p>
                </div>
                {!isAdding && !editingId && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-4 md:mt-0">
                        <button
                            onClick={() => setFilterMissingInfo(!filterMissingInfo)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterMissingInfo
                                    ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-navy-secondary'
                                }`}
                            title="築年数または階数が未設定の建物を抽出"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">未記入抽出</span>
                        </button>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="プロジェクト名で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy-secondary focus:outline-none focus:ring-2 focus:ring-navy-primary/20 transition-all"
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
                            className="flex items-center space-x-2 bg-navy-primary text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-navy-secondary transition-all shadow-lg shadow-navy-primary/20 w-full sm:w-auto justify-center"
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
                    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl p-8 border border-navy-primary/10 space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-navy-primary uppercase tracking-widest">
                                {editingId ? 'プロジェクト編集' : '新規プロジェクト登録'}
                            </h3>
                            <button type="button" onClick={handleCancel} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">キャンセル</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">プロジェクト名 <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary"
                                    placeholder="Riviera Jomtien"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">エリア <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.area_id}
                                    onChange={e => setFormData({ ...formData, area_id: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary appearance-none"
                                >
                                    <option value="">エリアを選択</option>
                                    <optgroup label="Pattaya">
                                        {areas.filter(a => a.region?.name === 'Pattaya').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Sriracha">
                                        {areas.filter(a => a.region?.name === 'Sriracha').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </optgroup>
                                    {areas.filter(a => a.region?.name !== 'Pattaya' && a.region?.name !== 'Sriracha').length > 0 && (
                                        <optgroup label="Other">
                                            {areas.filter(a => a.region?.name !== 'Pattaya' && a.region?.name !== 'Sriracha').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイプ</label>
                                <select
                                    value={formData.property_type}
                                    onChange={e => setFormData({ ...formData, property_type: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold"
                                >
                                    <option value="Condo">Condo</option>
                                    <option value="House">House</option>
                                    <option value="Townhouse">Townhouse</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">築年数</label>
                                <input
                                    type="text"
                                    value={formData.year_built || ''}
                                    onChange={e => setFormData({ ...formData, year_built: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold"
                                    placeholder="2023"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総階数</label>
                                <input
                                    type="number"
                                    value={formData.total_floors || ''}
                                    onChange={e => setFormData({ ...formData, total_floors: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold"
                                    placeholder="40"
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                            <div className="h-auto p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                <CoordinatePicker lat={formData.latitude || 12.9236} lng={formData.longitude || 100.8824} onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })} />
                            </div>
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

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">プロジェクト基本情報</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && projects.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">読み込み中...</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-20 text-center font-bold text-slate-300">
                                        プロジェクトが見つかりません
                                    </td>
                                </tr>
                            ) : (
                                paginatedProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-start space-x-4">
                                                <div className="w-12 h-12 rounded-xl bg-navy-primary/5 flex items-center justify-center text-navy-primary">
                                                    <Building2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-navy-secondary">{project.name}</p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <span className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                                            <MapPin className="w-3 h-3 mr-1" />
                                                            {areas.find(a => a.id === project.area_id)?.name || 'Unknown Area'}
                                                        </span>
                                                        <span className="flex items-center text-[10px] font-bold text-navy-primary bg-navy-primary/5 px-2.5 py-1 rounded-full">
                                                            <Layers className="w-3 h-3 mr-1" />
                                                            {project.property_type}
                                                        </span>
                                                        {project.year_built && (
                                                            <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                                <Calendar className="w-3 h-3 mr-1" />
                                                                {project.year_built}年
                                                            </span>
                                                        )}
                                                        {project.total_floors && (
                                                            <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                                                地上{project.total_floors}階
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleEdit(project)}
                                                    className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-navy-primary hover:text-white transition-all group"
                                                    title="詳細を編集"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(project.id)}
                                                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="削除"
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

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 mt-2">
                        <span className="text-xs font-bold text-slate-400">
                            全 {filteredProjects.length} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProjects.length)} 件を表示
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
