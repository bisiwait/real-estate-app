'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { maxPageForCount } from '@/lib/admin-list-url'
import { useAdminTablePagination } from '@/hooks/useAdminTablePagination'
import AdminRowsPerPageSelect from '@/components/admin/AdminRowsPerPageSelect'
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
    Filter,
    Shield
} from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import GoogleMapsShareLinkField from '@/components/property/GoogleMapsShareLinkField'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { getPropertyTypeOptionLabel } from '@/lib/property-type-i18n'

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
    name_jp?: string | null
    area_id: string
    property_type: string
    year_built: string
    total_floors: number | null
    address: string
    image_url: string
    latitude: number | null
    longitude: number | null
    google_place_id?: string | null
    google_maps_share_url?: string | null
    developer_id?: string | null
    average_price_sqm?: number | null
    total_units?: number | null
    facilities?: string[]
}

function sortAreas(mappedAreas: Area[]) {
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
    return mappedAreas
}

export default function AdminProjectManagement() {
    const params = useParams()
    const locale = typeof params?.locale === 'string' ? params.locale : 'jp'
    const [projects, setProjects] = useState<Project[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [developers, setDevelopers] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const formRef = useRef<HTMLDivElement>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterMissingInfo, setFilterMissingInfo] = useState(false)
    const [totalCount, setTotalCount] = useState<number | null>(null)
    const { limit, page, setPage, setLimit } = useAdminTablePagination()

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => window.clearTimeout(t)
    }, [searchQuery])

    const prevDebouncedRef = useRef(debouncedSearch)
    useEffect(() => {
        if (prevDebouncedRef.current !== debouncedSearch) {
            prevDebouncedRef.current = debouncedSearch
            if (page !== 1) setPage(1)
        }
    }, [debouncedSearch, page, setPage])

    const prevMissingRef = useRef(filterMissingInfo)
    useEffect(() => {
        if (prevMissingRef.current !== filterMissingInfo) {
            prevMissingRef.current = filterMissingInfo
            if (page !== 1) setPage(1)
        }
    }, [filterMissingInfo, page, setPage])

    const [formData, setFormData] = useState<Partial<Project>>({
        name: '',
        name_jp: '',
        area_id: '',
        property_type: 'Condo',
        year_built: '',
        total_floors: null,
        address: '',
        image_url: '',
        latitude: 12.9236,
        longitude: 100.8824,
        google_place_id: '',
        google_maps_share_url: '',
        developer_id: '',
        total_units: null,
        facilities: []
    })

    const fetchMeta = useCallback(async () => {
        setErrorMessage(null)
        try {
            const res = await fetch('/api/admin/projects?meta=1')
            const data = (await res.json().catch(() => ({}))) as {
                areas?: Area[]
                developers?: { id: string; name: string }[]
                error?: string
            }
            if (!res.ok) throw new Error(data.error || 'メタ情報の取得に失敗しました')
            setDevelopers(data.developers || [])
            setAreas(sortAreas(data.areas || []))
        } catch (err: unknown) {
            console.error('Fetch meta error:', err)
            setErrorMessage(getErrorMessage(err))
        }
    }, [])

    const fetchProjectsPage = useCallback(async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            })
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
            if (filterMissingInfo) params.set('missing', '1')

            const res = await fetch(`/api/admin/projects?${params}`)
            const data = (await res.json().catch(() => ({}))) as {
                projects?: Project[]
                totalCount?: number
                error?: string
            }
            if (!res.ok) throw new Error(data.error || 'プロジェクト一覧の取得に失敗しました')
            setProjects(data.projects || [])
            setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : 0)
        } catch (err: unknown) {
            console.error('Fetch projects error:', err)
            setErrorMessage(getErrorMessage(err))
            setProjects([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, filterMissingInfo, page, limit])

    useEffect(() => {
        void fetchMeta()
    }, [fetchMeta])

    useEffect(() => {
        void fetchProjectsPage()
    }, [fetchProjectsPage])

    useEffect(() => {
        if (totalCount === null) return
        const maxP = maxPageForCount(totalCount, limit)
        if (page > maxP) setPage(maxP)
    }, [totalCount, limit, page, setPage])

    const SHARED_FACILITIES = [
        'プール',
        'インフィニティプール',
        'サウナ',
        'フィットネス',
        'スカイラウンジ',
        '多目的ルーム',
        'キッズルーム',
        'レストラン',
        'EV充電器',
        'オートロック',
        '24Hセキュリティ',
        'コンシェルジュ',
        '駐車場',
        'WiFi',
        'シャトルサービス'
    ]

    const FACILITY_LABELS: Record<string, { en: string; th: string }> = {
        'プール': { en: 'Pool', th: 'สระว่ายน้ำ' },
        'インフィニティプール': { en: 'Infinity Pool', th: 'สระอินฟินิตี้' },
        'サウナ': { en: 'Sauna', th: 'ซาวน่า' },
        'フィットネス': { en: 'Fitness', th: 'ฟิตเนส' },
        'スカイラウンジ': { en: 'Sky Lounge', th: 'สกายเลานจ์' },
        '多目的ルーム': { en: 'Multi-purpose Room', th: 'ห้องอเนกประสงค์' },
        'キッズルーム': { en: 'Kids Room', th: 'ห้องเด็กเล่น' },
        'レストラン': { en: 'Restaurant', th: 'ร้านอาหาร' },
        'EV充電器': { en: 'EV Charger', th: 'แท่นชาร์จ EV' },
        'オートロック': { en: 'Auto Lock', th: 'ระบบล็อกอัตโนมัติ' },
        '24Hセキュリティ': { en: '24H Security', th: 'รปภ. 24 ชม.' },
        'コンシェルジュ': { en: 'Concierge', th: 'คอนเซียร์จ' },
        '駐車場': { en: 'Parking', th: 'ที่จอดรถ' },
        WiFi: { en: 'WiFi', th: 'WiFi' },
        'シャトルサービス': { en: 'Shuttle Service', th: 'บริการรถรับส่ง' },
    }

    const localizeFacility = (facility: string) => {
        const labels = FACILITY_LABELS[facility]
        if (!labels) return facility
        if (locale === 'en') return labels.en
        if (locale === 'th') return labels.th
        return facility
    }

    const sharedFacilitiesLabel = locale === 'en'
        ? 'Shared Facilities'
        : locale === 'th'
            ? 'สิ่งอำนวยความสะดวกส่วนกลาง'
            : '共有施設'
    const srirachaAreaGroupLabel = locale === 'th' ? 'ศรีราชา' : 'Sriracha'

    const totalPages =
        totalCount !== null && totalCount > 0 ? Math.max(1, Math.ceil(totalCount / limit)) : 1
    const fromRow = totalCount === 0 ? 0 : (page - 1) * limit + 1
    const toRow = totalCount === null ? 0 : Math.min(page * limit, totalCount)

    // Scroll to form when adding or editing
    useEffect(() => {
        if (isAdding || editingId) {
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [isAdding, editingId]);

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
            name_jp: '',
            area_id: '',
            property_type: 'Condo',
            year_built: '',
            total_floors: null,
            address: '',
            image_url: '',
            latitude: 12.9236,
            longitude: 100.8824,
            google_place_id: '',
            google_maps_share_url: '',
            developer_id: '',
            total_units: null,
            facilities: []
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage(null)

        try {
            const projectData = {
                name: formData.name,
                name_jp: formData.name_jp,
                area_id: formData.area_id,
                property_type: formData.property_type,
                year_built: formData.year_built,
                total_floors: formData.total_floors,
                address: formData.address,
                image_url: formData.image_url,
                latitude: formData.latitude,
                longitude: formData.longitude,
                google_place_id: formData.google_place_id?.trim() || null,
                google_maps_share_url: formData.google_maps_share_url?.trim() || null,
                developer_id: formData.developer_id || null,
                total_units: formData.total_units,
                facilities: formData.facilities || []
            }

            if (editingId) {
                const res = await fetch(`/api/admin/projects/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData),
                })
                const data = (await res.json().catch(() => ({}))) as { error?: string }
                if (!res.ok) throw new Error(data.error || '更新に失敗しました')
            } else {
                const res = await fetch('/api/admin/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData),
                })
                const data = (await res.json().catch(() => ({}))) as { error?: string }
                if (!res.ok) throw new Error(data.error || '登録に失敗しました')
            }

            handleCancel()
            await fetchProjectsPage()
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
            const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
            const data = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) throw new Error(data.error || '削除に失敗しました')
            await fetchProjectsPage()
        } catch (err: unknown) {
            console.error('Delete error:', err)
            setErrorMessage('削除できませんでした。このプロジェクトに紐づく物件が既に存在している可能性があります。')
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
                            プロジェクト情報管理<span className="hidden md:inline">（建物マスター）</span>
                        </h2>
                        {!loading && totalCount !== null && (
                            <span className="shrink-0 rounded-full bg-navy-primary/10 px-2.5 py-1 text-[11px] font-bold text-navy-primary md:px-3 md:text-xs">
                                {totalCount}件
                            </span>
                        )}
                    </div>
                    <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 md:block">Project Master Management</p>
                </div>
                {!isAdding && !editingId && (
                    <div className="mt-3 flex items-center gap-2 md:mt-4 md:flex-wrap md:gap-4">
                        <AdminRowsPerPageSelect
                            id="admin-projects-limit"
                            value={limit}
                            onChange={setLimit}
                            className="w-full shrink-0 justify-end md:w-auto"
                        />
                        <button
                            onClick={() => setFilterMissingInfo(!filterMissingInfo)}
                            className={`flex shrink-0 items-center justify-center space-x-1 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all md:space-x-2 md:px-4 md:text-xs ${filterMissingInfo
                                ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-navy-secondary'
                                }`}
                            title="築年数または階数が未設定の建物を抽出"
                        >
                            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span><span className="md:hidden">未記入</span><span className="hidden md:inline">未記入抽出</span></span>
                        </button>
                        <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 md:h-4 md:w-4" />
                            <input
                                type="text"
                                placeholder="プロジェクト名で検索..."
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
                    <div ref={formRef}>
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
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">プロジェクト名 (日本語)</label>
                                    <input
                                        type="text"
                                        value={formData.name_jp || ''}
                                        onChange={e => setFormData({ ...formData, name_jp: e.target.value })}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary"
                                        placeholder="リビエラ・ジョムティエン"
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
                                        <optgroup label={srirachaAreaGroupLabel}>
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
                                        <option value="Condo">{getPropertyTypeOptionLabel('Condo', locale)}</option>
                                        <option value="House">{getPropertyTypeOptionLabel('House', locale)}</option>
                                        <option value="Townhouse">{getPropertyTypeOptionLabel('Townhouse', locale)}</option>
                                        <option value="Apartment">{getPropertyTypeOptionLabel('Apartment', locale)}</option>
                                        <option value="ServiceApartment">{getPropertyTypeOptionLabel('ServiceApartment', locale)}</option>
                                        <option value="Commercial">{getPropertyTypeOptionLabel('Commercial', locale)}</option>
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
                                        placeholder="30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総ユニット数</label>
                                    <input
                                        type="number"
                                        value={formData.total_units || ''}
                                        onChange={e => setFormData({ ...formData, total_units: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold"
                                        placeholder="200"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2 ml-1">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">デベロッパー</label>
                                        {developers.length === 0 && (
                                            <span className="text-[10px] font-bold text-amber-600 animate-pulse">※先にデベロッパー登録が必要です</span>
                                        )}
                                    </div>
                                    <select
                                        value={formData.developer_id || ''}
                                        onChange={e => setFormData({ ...formData, developer_id: e.target.value })}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary appearance-none"
                                    >
                                        <option value="">デベロッパーを選択</option>
                                        {developers.map(dev => (
                                            <option key={dev.id} value={dev.id}>{dev.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                                <div className="h-auto space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                                    <GoogleMapsShareLinkField
                                        shareUrl={formData.google_maps_share_url ?? ''}
                                        onShareUrlChange={(v) =>
                                            setFormData((prev) => ({ ...prev, google_maps_share_url: v }))
                                        }
                                        onResolved={(data) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                google_place_id:
                                                    data.google_place_id != null
                                                        ? data.google_place_id
                                                        : prev.google_place_id ?? '',
                                                google_maps_share_url:
                                                    data.maps_share_url ?? prev.google_maps_share_url ?? '',
                                                latitude: data.latitude ?? prev.latitude ?? 12.9236,
                                                longitude: data.longitude ?? prev.longitude ?? 100.8824,
                                            }))
                                        }
                                    />
                                    <CoordinatePicker
                                        lat={formData.latitude || 12.9236}
                                        lng={formData.longitude || 100.8824}
                                        googlePlaceId={formData.google_place_id}
                                        mapsShareUrl={formData.google_maps_share_url}
                                        placeNameHint={
                                            [formData.name_jp, formData.name]
                                                .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
                                                .join(' ')
                                                .trim() || null
                                        }
                                        onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <label className="block text-xs font-black text-navy-primary uppercase tracking-widest mb-4 ml-1 flex items-center">
                                    <Shield className="w-4 h-4 mr-2" />
                                    {sharedFacilitiesLabel}
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {SHARED_FACILITIES.map(facility => {
                                        const isSelected = formData.facilities?.includes(facility)
                                        return (
                                            <button
                                                key={facility}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        facilities: isSelected
                                                            ? prev.facilities?.filter((f: string) => f !== facility)
                                                            : [...(prev.facilities || []), facility]
                                                    }))
                                                }}
                                                className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all border-2 text-center ${isSelected ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                                            >
                                                {localizeFacility(facility)}
                                            </button>
                                        )
                                    })}
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
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {loading && projects.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-10 h-10 text-navy-primary/20 animate-spin mb-4" />
                            <p className="font-bold">読み込み中...</p>
                        </div>
                    ) : !loading && totalCount === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                            <Building2 className="w-10 h-10 mb-4" />
                            <p className="font-bold">プロジェクトが見つかりません</p>
                        </div>
                    ) : (
                        projects.map((project) => {
                            const areaName = areas.find(a => a.id === project.area_id)?.name || '—'
                            const developerName = (project as any).developer_id
                                ? developers.find(d => d.id === (project as any).developer_id)?.name || '—'
                                : null
                            return (
                                <div key={project.id} className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-colors last:mb-0 md:mb-0 md:rounded-none md:border-0 md:bg-transparent md:shadow-none hover:bg-slate-50/30">
                                    {/* Mobile layout */}
                                    <div className="md:hidden">
                                        {/* Header */}
                                        <div className="flex items-start gap-3 px-3 py-3">
                                            {/* Image */}
                                            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                                {project.image_url ? (
                                                    <Image
                                                        src={project.image_url}
                                                        alt={project.name}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-navy-primary/5">
                                                        <Building2 className="h-4 w-4 text-navy-primary/20" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Title block */}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-black leading-snug text-navy-secondary">{project.name}</p>
                                                {project.name_jp && (
                                                    <p className="mt-0.5 text-[10px] font-bold text-slate-400">{project.name_jp}</p>
                                                )}
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <span className="inline-flex w-fit items-center rounded-md bg-navy-primary/8 px-1.5 py-0.5 text-[9px] font-black text-navy-primary">
                                                        <Layers className="mr-0.5 h-2.5 w-2.5" />{project.property_type}
                                                    </span>
                                                    <div className="flex flex-shrink-0 gap-1.5">
                                                        <button onClick={() => handleEdit(project)} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-navy-primary hover:text-white transition-all">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDelete(project.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Info grid */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">エリア</p>
                                                    <p className="text-[11px] font-black text-navy-secondary">{areaName}</p>
                                                </div>
                                            </div>
                                            {project.year_built && (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">竣工</p>
                                                        <p className="text-[11px] font-black text-navy-secondary">{project.year_built}年</p>
                                                    </div>
                                                </div>
                                            )}
                                            {project.total_floors && (
                                                <div className="flex items-center gap-1.5">
                                                    <Layers className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">階数</p>
                                                        <p className="text-[11px] font-black text-navy-secondary">{project.total_floors}F</p>
                                                    </div>
                                                </div>
                                            )}
                                            {project.total_units && (
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">総戸数</p>
                                                        <p className="text-[11px] font-black text-navy-secondary">{project.total_units}戸</p>
                                                    </div>
                                                </div>
                                            )}
                                            {developerName && (
                                                <div className="flex items-center gap-1.5 col-span-2">
                                                    <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">デベロッパー</p>
                                                        <p className="text-[11px] font-black text-navy-secondary">{developerName}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {project.facilities && project.facilities.length > 0 && (
                                                <div className="flex items-center gap-1.5 col-span-2">
                                                    <Shield className="w-3 h-3 text-navy-primary/50 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">共有施設</p>
                                                        <p className="text-[11px] font-black text-navy-secondary">{project.facilities.length}件</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop layout */}
                                    <div className="hidden md:flex items-start gap-4 p-5">
                                        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy-primary/5">
                                            {project.image_url ? (
                                                <Image
                                                    src={project.image_url}
                                                    alt={project.name}
                                                    fill
                                                    sizes="64px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <Building2 className="w-7 h-7 text-navy-primary/30" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-navy-secondary">
                                                {project.name}
                                                {project.name_jp && <span className="ml-2 text-xs font-bold text-slate-400">({project.name_jp})</span>}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                <span className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    <MapPin className="w-3 h-3 mr-0.5" />{areaName}
                                                </span>
                                                <span className="flex items-center text-[10px] font-bold text-navy-primary bg-navy-primary/5 px-2 py-0.5 rounded-full">
                                                    <Layers className="w-3 h-3 mr-0.5" />{project.property_type}
                                                </span>
                                                {project.year_built && (
                                                    <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        <Calendar className="w-3 h-3 mr-0.5" />{project.year_built}年
                                                    </span>
                                                )}
                                                {project.total_floors && (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        地上{project.total_floors}階
                                                    </span>
                                                )}
                                                {developerName && (
                                                    <span className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        <Building2 className="w-3 h-3 mr-0.5" />{developerName}
                                                    </span>
                                                )}
                                                {project.facilities && project.facilities.length > 0 && (
                                                    <span className="flex items-center text-[10px] font-bold text-navy-primary bg-navy-primary/5 px-2 py-0.5 rounded-full">
                                                        <Shield className="w-3 h-3 mr-0.5" />共有施設 {project.facilities.length}件
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => handleEdit(project)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-navy-primary hover:text-white transition-all" title="編集">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(project.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="削除">
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
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 mt-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
        </div >
    )
}
