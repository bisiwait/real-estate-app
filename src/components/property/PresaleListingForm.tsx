'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Plus,
    X,
    MapPin,
    Tag as TagIcon,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Building2,
    Calendar,
    Wallet
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Select from 'react-select'

const ImageUploader = dynamic(() => import('./ImageUploader'), {
    loading: () => <div className="border-2 border-dashed rounded-3xl p-10 text-center border-slate-100 bg-slate-50 animate-pulse h-[300px]" />,
    ssr: false
})

const CoordinatePicker = dynamic(() => import('./CoordinatePicker'), {
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
    address?: string
    property_type?: string
    year_built?: string
    total_floors?: number | string
    latitude?: number
    longitude?: number
}

interface PresaleListingFormProps {
    initialData?: any
    mode?: 'create' | 'edit'
}

export default function PresaleListingForm({ initialData, mode = 'create' }: PresaleListingFormProps) {
    const [loading, setLoading] = useState(false)
    const [areas, setAreas] = useState<Area[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [showNewProjectForm, setShowNewProjectForm] = useState(false)

    const [projectForm, setProjectForm] = useState({
        name: '',
        area_id: '',
        address: '',
        property_type: 'Condo',
        year_built: '',
        total_floors: '',
        latitude: 12.9236,
        longitude: 100.8824
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
    const router = useRouter()
    const supabase = createClient()

    const JA_TAGS = [
        'バスタブあり',
        'ウォシュレット完備',
        '洗濯機',
        'テレビ',
        '冷蔵庫',
        'WiFi',
        'ペット可',
        'EV充電器あり',
        '高層階',
        '築浅',
        '格安',
        '高級物件',
        'バルコニー広い',
        'オーシャンビュー',
        'シティービュー'
    ]

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        is_for_rent: false, // プレセールは通常売買メイン
        is_for_sale: true,
        sale_price: initialData?.sale_price?.toString() || initialData?.price?.toString() || '',
        area_id: initialData?.area_id || '',
        project_id: initialData?.project_id || '',
        building_name: initialData?.building_name || '',
        project_name: initialData?.project_name || '',
        tags: initialData?.tags || [] as string[],

        // Presale specific fields
        is_presale: true,
        completion_date: initialData?.completion_date || '',
        payment_plan: initialData?.payment_plan || '',
        construction_status: initialData?.construction_status || 'planning',
        land_area: initialData?.land_area || '',
        total_units: initialData?.total_units?.toString() || '',
        total_buildings: initialData?.total_buildings?.toString() || '',
        developer: initialData?.developer || '',

        // Attributes
        property_type: initialData?.property_type || 'Condo',
        sqm: initialData?.sqm?.toString() || '',
        floor: initialData?.floor || '',
        bedrooms: initialData?.bedrooms?.toString() || '0',
        bathrooms: initialData?.bathrooms?.toString() || '0',
        year_built: initialData?.year_built || '',
        total_floors: initialData?.total_floors?.toString() || '',
        ownership_type: initialData?.ownership_type || 'Foreign Quota',

        // Facilities matching specific boolean columns to maintain compatibility
        has_bathtub: initialData?.has_bathtub || false,
        has_washlet: initialData?.has_washlet || false,
        allows_pets: initialData?.allows_pets || false,
        has_ev_charger: initialData?.has_ev_charger || false,
        has_japanese_tv: initialData?.has_japanese_tv || false
    })

    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single()
                setIsAdmin(!!data?.is_admin)
            }
        }
        checkAdmin()
    }, [supabase])

    useEffect(() => {
        const fetchInitialData = async () => {
            const [areasRes, projectsRes] = await Promise.all([
                supabase.from('areas').select('id, name, region:regions(name)').order('name'),
                supabase.from('projects').select('*').order('name')
            ])

            if (areasRes.data) {
                const mappedAreas = areasRes.data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    region: item.region || { name: '' }
                }))
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
            }
            if (projectsRes.data) {
                setProjects(projectsRes.data)
            }
        }
        fetchInitialData()
    }, [supabase])

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            const isSelected = prev.tags.includes(tag)
            const nextTags = isSelected
                ? prev.tags.filter((t: string) => t !== tag)
                : [...prev.tags, tag]

            const nextData = { ...prev, tags: nextTags }
            if (tag === 'ペット可') nextData.allows_pets = !isSelected
            if (tag === 'EV充電器あり') nextData.has_ev_charger = !isSelected
            if (tag === 'バスタブあり') nextData.has_bathtub = !isSelected
            if (tag === 'ウォシュレット完備') nextData.has_washlet = !isSelected
            return nextData
        })
    }

    const uploadImages = async (propertyId: string) => {
        const uploadedUrls: string[] = []
        for (const file of selectedFiles) {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${propertyId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('property-images')
                .upload(filePath, file)

            if (uploadError) {
                throw new Error(`画像のアップロードに失敗しました (${file.name}): ${uploadError.message}`)
            }

            const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath)
            uploadedUrls.push(publicUrl)
        }
        return uploadedUrls
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) throw new Error('Unauthorized')

            let finalProjectId = formData.project_id

            if (showNewProjectForm) {
                if (!projectForm.name || !formData.area_id) {
                    throw new Error('プロジェクト名とエリアは必須です。')
                }
                const { data: newProject, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                        name: projectForm.name,
                        area_id: formData.area_id,
                        address: projectForm.address,
                        property_type: projectForm.property_type,
                        year_built: projectForm.year_built,
                        total_floors: projectForm.total_floors ? parseInt(projectForm.total_floors as string) : null,
                        latitude: projectForm.latitude,
                        longitude: projectForm.longitude
                    })
                    .select()
                    .single()
                if (projectError) throw projectError
                finalProjectId = newProject.id
            }

            if (!formData.sale_price) {
                throw new Error('プレセール価格（販売価格）は必須です。')
            }

            let propertyId = initialData?.id
            if (mode === 'create') {
                const { data: newProperty, error: insertError } = await supabase
                    .from('properties')
                    .insert({
                        user_id: user.id,
                        title: formData.title,
                        description: formData.description,
                        is_for_rent: false,
                        is_for_sale: true,
                        sale_price: parseFloat(formData.sale_price),
                        area_id: formData.area_id,
                        project_id: finalProjectId || null,
                        building_name: formData.building_name,
                        project_name: formData.project_name,
                        images: [],
                        tags: formData.tags,
                        status: 'pending',
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        property_type: formData.property_type,
                        sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                        floor: formData.floor,
                        bedrooms: parseInt(formData.bedrooms),
                        bathrooms: parseInt(formData.bathrooms),
                        year_built: formData.year_built,
                        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                        ownership_type: formData.ownership_type,

                        // Presale specifics
                        is_presale: true,
                        completion_date: formData.completion_date,
                        payment_plan: formData.payment_plan,
                        construction_status: formData.construction_status,
                        land_area: formData.land_area,
                        total_units: formData.total_units ? parseInt(formData.total_units) : null,
                        total_buildings: formData.total_buildings ? parseInt(formData.total_buildings) : null,
                        developer: formData.developer,

                        // Booleans mapped from tags
                        has_bathtub: formData.has_bathtub,
                        has_washlet: formData.has_washlet,
                        allows_pets: formData.allows_pets,
                        has_japanese_tv: formData.has_japanese_tv,
                        has_ev_charger: formData.has_ev_charger
                    })
                    .select()
                    .single()

                if (insertError) throw insertError
                propertyId = newProperty.id
            }

            const newImageUrls = await uploadImages(propertyId)
            const finalImages = [...existingImages, ...newImageUrls]

            if (finalImages.length === 0) {
                throw new Error('少なくとも1枚の画像をアップロードしてください。')
            }

            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    title: formData.title,
                    description: formData.description,
                    is_for_rent: false,
                    is_for_sale: true,
                    sale_price: parseFloat(formData.sale_price),
                    project_id: finalProjectId || null,
                    building_name: formData.building_name,
                    project_name: formData.project_name,
                    images: finalImages,
                    tags: formData.tags,
                    updated_at: new Date().toISOString(),
                    property_type: formData.property_type,
                    sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                    floor: formData.floor,
                    bedrooms: parseInt(formData.bedrooms),
                    bathrooms: parseInt(formData.bathrooms),
                    year_built: formData.year_built,
                    total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                    ownership_type: formData.ownership_type,

                    // Presale specifics
                    is_presale: true,
                    completion_date: formData.completion_date,
                    payment_plan: formData.payment_plan,
                    construction_status: formData.construction_status,
                    land_area: formData.land_area,
                    total_units: formData.total_units ? parseInt(formData.total_units) : null,
                    total_buildings: formData.total_buildings ? parseInt(formData.total_buildings) : null,
                    developer: formData.developer,

                    has_bathtub: formData.has_bathtub,
                    has_washlet: formData.has_washlet,
                    allows_pets: formData.allows_pets,
                    has_japanese_tv: formData.has_japanese_tv,
                    has_ev_charger: formData.has_ev_charger
                })
                .eq('id', propertyId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            setSuccess(true)
            setTimeout(() => router.push('/dashboard'), 2000)
        } catch (err: any) {
            console.error('Submit error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100">
                <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-emerald-600 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-navy-secondary mb-4">{mode === 'create' ? 'プレセール案件掲載完了！' : '更新完了！'}</h2>
                <p className="text-slate-500 mb-8">ダッシュボードに移動します...</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full animate-progress-fast"></div>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 flex items-start space-x-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h3 className="text-navy-secondary font-black mb-1">プレセール物件登録モード</h3>
                    <p className="text-xs text-slate-600 font-medium">このフォームから登録された物件は「プレセール（完成前）プロジェクト」として、専用のバッジやスケジュール情報と共に表示されます。販売専用となります。</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">1</span>
                    プロジェクト基本情報
                </h3>

                {/* Area & Project Selection */}
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">エリア (Area) <span className="text-red-500">*</span></label>
                        <select
                            value={formData.area_id}
                            onChange={e => {
                                const val = e.target.value
                                setFormData({ ...formData, area_id: val, project_id: '' })
                                setShowNewProjectForm(false)
                            }}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary appearance-none"
                        >
                            <option value="">先にエリアを選択してください</option>
                            <optgroup label="Pattaya">
                                {areas.filter(a => a.region?.name === 'Pattaya').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </optgroup>
                            <optgroup label="Sriracha">
                                {areas.filter(a => a.region?.name === 'Sriracha').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">プロジェクト名 <span className="text-red-500">*</span></label>
                            {formData.area_id && (
                                <button type="button" onClick={() => { setShowNewProjectForm(true); setFormData({ ...formData, project_id: 'new' }) }} className="text-[10px] font-bold text-navy-secondary hover:text-navy-primary transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full">
                                    + 新規プロジェクトとして登録
                                </button>
                            )}
                        </div>
                        {!formData.area_id ? (
                            <div className="w-full px-5 py-4 bg-slate-50 opacity-50 border border-slate-100 rounded-2xl font-bold text-slate-400 text-sm">
                                ※ 上の「エリア」を選択するとプロジェクトが選べるようになります
                            </div>
                        ) : showNewProjectForm ? (
                            <div className="w-full px-5 py-4 bg-navy-primary/5 border border-navy-primary/20 text-navy-primary rounded-2xl font-black text-sm text-center">
                                新規プロジェクト情報入力モード
                            </div>
                        ) : (
                            <Select
                                isDisabled={!formData.area_id}
                                placeholder="プロジェクト名で検索..."
                                noOptionsMessage={() => "見つかりません。右上の「＋新規登録」から追加してください。"}
                                options={projects.filter(p => !formData.area_id || p.area_id === formData.area_id).map(p => ({ value: p.id, label: p.name }))}
                                value={formData.project_id ? { value: formData.project_id, label: projects.find(p => p.id === formData.project_id)?.name || '' } : null}
                                onChange={(selectedOption) => {
                                    if (!selectedOption) {
                                        setFormData({ ...formData, project_id: '', building_name: '', title: '' })
                                        return
                                    }
                                    const val = selectedOption.value
                                    setShowNewProjectForm(false)
                                    const project = projects.find(p => p.id === val)
                                    setFormData({
                                        ...formData,
                                        project_id: val,
                                        area_id: project?.area_id || formData.area_id,
                                        building_name: project?.name || formData.building_name,
                                        property_type: project?.property_type || formData.property_type,
                                        year_built: project?.year_built || formData.year_built,
                                        total_floors: project?.total_floors?.toString() || formData.total_floors,
                                        title: project?.name || formData.title
                                    })
                                }}
                                styles={{
                                    control: (base) => ({ ...base, padding: '0.6rem', borderRadius: '1rem', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', boxShadow: 'none' }),
                                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#f1f5f9' : 'white', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }),
                                    menu: (base) => ({ ...base, borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }),
                                    placeholder: (base) => ({ ...base, fontWeight: 'bold', color: '#94a3b8' })
                                }}
                            />
                        )}
                    </div>

                    {showNewProjectForm && (
                        <div className="bg-slate-50 rounded-3xl p-8 border border-navy-primary/10 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-black text-navy-primary uppercase tracking-widest">新規プロジェクト基本情報</h4>
                                <button type="button" onClick={() => setShowNewProjectForm(false)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">キャンセル</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">プロジェクト名 <span className="text-red-500">*</span></label>
                                    <input type="text" value={projectForm.name} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, name: val }); setFormData({ ...formData, building_name: val, project_name: val, title: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary transition-all font-bold text-navy-secondary" placeholder="TBD Tower" />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                                    <div className="h-auto p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                        <CoordinatePicker lat={projectForm.latitude} lng={projectForm.longitude} onChange={(lat, lng) => setProjectForm({ ...projectForm, latitude: lat, longitude: lng })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">プレセール価格 (THB) <span className="text-red-500">*</span></label>
                            <input type="number" placeholder="2500000" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">所有権 (Ownership)</label>
                            <select value={formData.ownership_type} onChange={e => setFormData({ ...formData, ownership_type: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="Foreign Quota">外国人クオータ (Foreign Quota)</option>
                                <option value="Thai Quota">タイ人クオータ (Thai Quota)</option>
                                <option value="Thai Company">タイ法人名義 (Thai Company)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイプ</label>
                            <select value={formData.property_type} onChange={e => setFormData({ ...formData, property_type: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="Condo">コンドミニアム</option><option value="House">一軒家・ヴィラ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">専有面積 (sqm)</label>
                            <input type="number" value={formData.sqm} onChange={e => setFormData({ ...formData, sqm: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">想定間取り (Bedrooms)</label>
                            <select value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="0">Studio</option><option value="1">1 Bed</option><option value="2">2 Beds</option><option value="3">3 Beds+</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Presale specific info */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center mr-3 text-amber-500 text-sm font-black">2</span>
                    プレセール詳細 (Premium)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> 竣工予定時期 (完成年)</label>
                        <input type="text" placeholder="例: 2026年12月 または 2026" value={formData.completion_date} onChange={e => setFormData({ ...formData, completion_date: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">デベロッパー</label>
                        <input type="text" placeholder="例: Sansiri" value={formData.developer} onChange={e => setFormData({ ...formData, developer: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">敷地面積</label>
                        <input type="text" placeholder="例: 2 Rai 3 Ngan" value={formData.land_area} onChange={e => setFormData({ ...formData, land_area: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">現在の建設状況</label>
                        <select value={formData.construction_status} onChange={e => setFormData({ ...formData, construction_status: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl appearance-none font-bold">
                            <option value="planning">計画中 (Planning)</option>
                            <option value="under_construction">建設中 (Under Construction)</option>
                            <option value="completed">完成済 (Completed)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総戸数</label>
                        <input type="number" placeholder="例: 500" value={formData.total_units} onChange={e => setFormData({ ...formData, total_units: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">棟数</label>
                        <input type="number" placeholder="例: 2" value={formData.total_buildings} onChange={e => setFormData({ ...formData, total_buildings: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center"><Wallet className="w-3 h-3 mr-1" /> 支払いスケジュール・利回り等の補足</label>
                    <textarea rows={3} placeholder="例: 予約金10万バーツ、契約時20%、建設中30%、完成時50%。想定利回り7%保証。" value={formData.payment_plan} onChange={e => setFormData({ ...formData, payment_plan: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl resize-none font-medium text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">プロジェクトの魅力・アピールポイント <span className="text-red-500">*</span></label>
                    <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl resize-none font-medium" />
                </div>
            </div>

            {/* Section Image Gallery */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">3</span>
                    プロジェクト画像（完成予想図・パース等）
                </h3>
                <ImageUploader initialImages={existingImages} onImagesChange={(files) => setSelectedFiles(files)} />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between p-10 bg-navy-secondary rounded-3xl text-white shadow-2xl">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><TagIcon className="w-6 h-6 text-white" /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">掲載コスト</p><p className="text-xl font-black">1 クレジット / 案件</p></div>
                </div>
                <button disabled={loading} className="bg-amber-500 hover:bg-amber-600 border-2 border-amber-500 text-white px-12 py-4 rounded-2xl font-black text-lg transition-all flex items-center space-x-3 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" /> : <><span>プレセールを公開</span><Plus /></>}
                </button>
            </div>

            <style jsx>{` @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } } .animate-progress-fast { animation: progress-fast 2s linear infinite; } `}</style>
        </form>
    )
}
