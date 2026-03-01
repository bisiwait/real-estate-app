'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Plus,
    X,
    Image as ImageIcon,
    MapPin,
    Tag as TagIcon,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ChevronRight
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

import { getErrorMessage } from '@/lib/utils/errors'

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
    facilities?: string[]
    description?: string
    image_url?: string
    property_type?: string
    year_built?: string
    total_floors?: number | string
    latitude?: number
    longitude?: number
}

interface ListingFormProps {
    initialData?: any
    mode?: 'create' | 'edit'
}

export default function ListingForm({ initialData, mode = 'create' }: ListingFormProps) {
    const [loading, setLoading] = useState(false)
    const [areas, setAreas] = useState<Area[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [showNewProjectForm, setShowNewProjectForm] = useState(false)
    const [projectForm, setProjectForm] = useState({
        name: '',
        area_id: '',
        address: '',
        image_url: '',
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

    // AI Import states
    const [importUrl, setImportUrl] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
    const [submitStatus, setSubmitStatus] = useState<'pending' | 'draft'>('pending')

    const router = useRouter()
    const supabase = createClient()

    // Japanese tags options
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
        is_for_rent: initialData?.is_for_rent ?? (initialData?.listing_type === 'rent' || !initialData),
        is_for_sale: initialData?.is_for_sale ?? (initialData?.listing_type === 'sell'),
        rent_price: initialData?.rent_price?.toString() || (initialData?.listing_type === 'rent' ? initialData.price?.toString() : ''),
        sale_price: initialData?.sale_price?.toString() || (initialData?.listing_type === 'sell' ? initialData.price?.toString() : ''),
        area_id: initialData?.area_id || '',
        project_id: initialData?.project_id || '',
        building_name: initialData?.building_name || '',
        project_name: initialData?.project_name || '',
        tags: initialData?.tags || [] as string[],
        // Japanese specific fields
        has_bathtub: initialData?.has_bathtub || false,
        has_washlet: initialData?.has_washlet || false,
        water_heater_type: initialData?.water_heater_type || '',
        electricity_bill_type: initialData?.electricity_bill_type || 'Direct',
        water_bill_desc: initialData?.water_bill_desc || '',
        internet_desc: initialData?.internet_desc || '',
        distance_to_supermarket: initialData?.distance_to_supermarket || '',
        noise_level: initialData?.noise_level || 3,
        transportation_desc: initialData?.transportation_desc || '',
        allows_pets: initialData?.allows_pets || false,
        has_japanese_tv: initialData?.has_japanese_tv || false,
        has_ev_charger: initialData?.has_ev_charger || false,
        admin_memo: initialData?.admin_memo || '',
        status: initialData?.status || 'published',
        // Core specs
        property_type: initialData?.property_type || 'Condo',
        sqm: initialData?.sqm?.toString() || '',
        floor: initialData?.floor || '',
        bedrooms: initialData?.bedrooms?.toString() || '0',
        bathrooms: initialData?.bathrooms?.toString() || '0',
        year_built: initialData?.year_built || '',
        total_floors: initialData?.total_floors?.toString() || '',
        ownership_type: initialData?.ownership_type || ''
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
                setIsAdmin(data?.is_admin || false)
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
                // Ensure the mapping matches the interface
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

                    // Fallback to alphabetical region, then area name
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

            // Sync with specific boolean columns
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

            console.log(`Uploading image: ${file.name} to ${filePath}...`);
            const { error: uploadError, data } = await supabase.storage
                .from('property-images')
                .upload(filePath, file)

            if (uploadError) {
                console.error(`Upload failed for ${file.name}:`, uploadError);
                if (uploadError.message.includes('bucket not found') || (uploadError as any).status === 404) {
                    throw new Error('Supabase Storageに "property-images" バケットが見つかりません。')
                }
                throw new Error(`画像のアップロードに失敗しました (${file.name}): ${uploadError.message}`)
            }

            const { data: { publicUrl } } = supabase.storage
                .from('property-images')
                .getPublicUrl(filePath)

            uploadedUrls.push(publicUrl)
        }

        return uploadedUrls
    }

    const handleImport = async () => {
        if (!importUrl) return
        setIsImporting(true)
        setImportError(null)
        try {
            const res = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: importUrl })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'インポートに失敗しました')

            let matchedProjectId = ''
            let matchedAreaId = ''
            let matchedBuildingName = ''
            let needsNewProject = false
            let matchedNewAreaId = ''

            if (data.building_name) {
                // Try to find existing project
                const p = projects.find(p => p.name.toLowerCase().includes(data.building_name.toLowerCase()) || data.building_name.toLowerCase().includes(p.name.toLowerCase()))

                if (p) {
                    matchedProjectId = p.id
                    matchedAreaId = p.area_id
                    matchedBuildingName = p.name
                    setShowNewProjectForm(false)
                } else {
                    needsNewProject = true
                    matchedProjectId = 'new'
                    matchedBuildingName = data.building_name

                    // Try to guess area
                    if (data.area) {
                        const a = areas.find(a => a.name.toLowerCase().includes(data.area.toLowerCase()) || data.area.toLowerCase().includes(a.name.toLowerCase()) || (a.region?.name && a.region.name.toLowerCase().includes(data.area.toLowerCase())))
                        if (a) matchedNewAreaId = a.id
                    }

                    setShowNewProjectForm(true)
                    setProjectForm(pf => ({
                        ...pf,
                        name: data.building_name,
                        area_id: matchedNewAreaId
                    }))
                }
            }

            setFormData(prev => {
                const updated = {
                    ...prev,
                    title: data.title || prev.title,
                    description: data.description ? (prev.description ? prev.description + '\n\n' + data.description : data.description) : prev.description,
                    rent_price: data.price ? data.price.toString() : prev.rent_price,
                    sqm: data.sqm ? data.sqm.toString() : prev.sqm,
                    floor: data.floor ? data.floor.toString() : prev.floor,
                    is_for_rent: !!data.price || prev.is_for_rent,
                }

                if (matchedProjectId) {
                    updated.project_id = matchedProjectId
                    updated.area_id = matchedProjectId === 'new' ? matchedNewAreaId : matchedAreaId
                    updated.building_name = matchedBuildingName
                    updated.project_name = matchedBuildingName
                    if (!data.title) updated.title = matchedBuildingName
                }

                // Add layout info to description if found
                if (data.layout) {
                    updated.description = `【間取り】${data.layout}\n` + updated.description
                }

                return updated
            })

            if (data.amenities && Array.isArray(data.amenities)) {
                const newTags = new Set(formData.tags)
                data.amenities.forEach((am: string) => {
                    // Simple matching for known tags
                    JA_TAGS.forEach(t => {
                        if (am.includes(t) || t.includes(am) || (am.toLowerCase().includes('pet') && t === 'ペット可')) {
                            newTags.add(t)
                        }
                    })
                })
                setFormData(prev => ({
                    ...prev,
                    tags: Array.from(newTags),
                    allows_pets: newTags.has('ペット可'),
                    has_bathtub: newTags.has('バスタブあり'),
                    has_washlet: newTags.has('ウォシュレット完備'),
                    has_ev_charger: newTags.has('EV充電器あり'),
                    has_japanese_tv: newTags.has('テレビ')
                }))
            }
            if (data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0) {
                setExistingImages(prev => {
                    const newUrls = data.image_urls.filter((url: string) => !prev.includes(url))
                    return [...newUrls, ...prev]
                })
            } else if (data.main_image_url) {
                setExistingImages(prev => {
                    if (!prev.includes(data.main_image_url)) {
                        return [data.main_image_url, ...prev]
                    }
                    return prev
                })
            }
        } catch (err: any) {
            setImportError(err.message)
        } finally {
            setIsImporting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent, statusOverride?: 'draft' | 'pending') => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        let finalStatus: string = statusOverride || submitStatus

        if (mode === 'edit') {
            if (statusOverride === 'draft') {
                finalStatus = 'draft'
            } else {
                finalStatus = formData.status
            }
        } else {
            if (isAdmin && finalStatus === 'pending') {
                finalStatus = formData.status
            }
        }

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError) throw authError
            if (!user) throw new Error('Unauthorized')

            let finalProjectId = formData.project_id

            if (showNewProjectForm) {
                if (!projectForm.name || !projectForm.area_id) {
                    throw new Error('プロジェクト名とエリアは必須です。')
                }

                const { data: newProject, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                        name: projectForm.name,
                        area_id: projectForm.area_id,
                        address: projectForm.address,
                        image_url: projectForm.image_url,
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

            let propertyId = initialData?.id
            if (mode === 'create') {
                if (!formData.is_for_rent && !formData.is_for_sale) {
                    throw new Error('「賃貸」または「売買」の少なくとも一方は選択してください。')
                }

                const { data: newProperty, error: insertError } = await supabase
                    .from('properties')
                    .insert({
                        user_id: user.id,
                        title: formData.title,
                        description: formData.description,
                        is_for_rent: formData.is_for_rent,
                        is_for_sale: formData.is_for_sale,
                        rent_price: formData.is_for_rent ? parseFloat(formData.rent_price) : null,
                        sale_price: formData.is_for_sale ? parseFloat(formData.sale_price) : null,
                        area_id: formData.area_id,
                        project_id: finalProjectId || null,
                        building_name: formData.building_name,
                        project_name: formData.project_name,
                        images: [],
                        tags: formData.tags,
                        status: finalStatus,
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        has_bathtub: formData.has_bathtub,
                        has_washlet: formData.has_washlet,
                        water_heater_type: formData.water_heater_type,
                        electricity_bill_type: formData.electricity_bill_type,
                        water_bill_desc: formData.water_bill_desc,
                        internet_desc: formData.internet_desc,
                        distance_to_supermarket: formData.distance_to_supermarket,
                        noise_level: formData.noise_level,
                        transportation_desc: formData.transportation_desc,
                        allows_pets: formData.allows_pets,
                        has_japanese_tv: formData.has_japanese_tv,
                        has_ev_charger: formData.has_ev_charger,
                        admin_memo: formData.admin_memo,
                        property_type: formData.property_type,
                        sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                        floor: formData.floor,
                        bedrooms: parseInt(formData.bedrooms),
                        bathrooms: parseInt(formData.bathrooms),
                        year_built: formData.year_built,
                        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                        ownership_type: formData.is_for_sale ? formData.ownership_type : null
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
                    is_for_rent: formData.is_for_rent,
                    is_for_sale: formData.is_for_sale,
                    rent_price: formData.is_for_rent ? parseFloat(formData.rent_price) : null,
                    sale_price: formData.is_for_sale ? parseFloat(formData.sale_price) : null,
                    project_id: finalProjectId || null,
                    building_name: formData.building_name,
                    project_name: formData.project_name,
                    images: finalImages,
                    tags: formData.tags,
                    status: finalStatus,
                    updated_at: new Date().toISOString(),
                    has_bathtub: formData.has_bathtub,
                    has_washlet: formData.has_washlet,
                    water_heater_type: formData.water_heater_type,
                    electricity_bill_type: formData.electricity_bill_type,
                    water_bill_desc: formData.water_bill_desc,
                    internet_desc: formData.internet_desc,
                    distance_to_supermarket: formData.distance_to_supermarket,
                    noise_level: formData.noise_level,
                    transportation_desc: formData.transportation_desc,
                    allows_pets: formData.allows_pets,
                    has_japanese_tv: formData.has_japanese_tv,
                    has_ev_charger: formData.has_ev_charger,
                    admin_memo: formData.admin_memo,
                    property_type: formData.property_type,
                    sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                    floor: formData.floor,
                    bedrooms: parseInt(formData.bedrooms),
                    bathrooms: parseInt(formData.bathrooms),
                    year_built: formData.year_built,
                    total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                    ownership_type: formData.is_for_sale ? formData.ownership_type : null
                })
                .eq('id', propertyId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            // Sync project data if admin edited an existing project
            if (!showNewProjectForm && formData.project_id && isAdmin) {
                const { error: projectSyncError } = await supabase
                    .from('projects')
                    .update({
                        property_type: formData.property_type,
                        year_built: formData.year_built,
                        total_floors: formData.total_floors ? parseInt(formData.total_floors as string) : null
                    })
                    .eq('id', formData.project_id)

                if (projectSyncError) {
                    console.warn('Failed to sync project data:', projectSyncError)
                }
            }

            setSuccess(true)
            setTimeout(() => router.push(isAdmin ? '/admin-secret' : '/dashboard'), 2000)
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
                <h2 className="text-3xl font-black text-navy-secondary mb-4">{mode === 'create' ? '掲載完了！' : '更新完了！'}</h2>
                <p className="text-slate-500 mb-8">{mode === 'create' ? '物件情報が正常に公開されました。' : '物件情報が正常に更新されました。'}ダッシュボードに移動します...</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full animate-progress-fast"></div>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={(e) => handleSubmit(e, 'pending')} className="space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* AI Import Section (Admin Only) */}
            {isAdmin && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl shadow-lg p-8 border border-indigo-100 space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">AI</div>
                        <h3 className="text-lg font-black text-indigo-900">AI 物件インポーター</h3>
                    </div>
                    <p className="text-indigo-700 text-sm font-medium">外部の不動産サイトのURLを入力すると、AIが情報を抽出し、日本語に翻訳してフォームを自動入力します。</p>
                    <div className="flex space-x-4">
                        <input
                            type="url"
                            placeholder="https://example.com/property/123"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className="flex-1 px-5 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                            disabled={isImporting}
                        />
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={isImporting || !importUrl}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center space-x-2 disabled:opacity-50"
                        >
                            {isImporting ? <Loader2 className="animate-spin w-5 h-5" /> : <span>インポート開始</span>}
                        </button>
                    </div>
                    {isImporting && (
                        <div className="text-indigo-600 text-sm font-bold flex items-center animate-pulse">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            URLを解析・翻訳中... ワクワクしながらお待ちください！✨
                        </div>
                    )}
                    {importError && (
                        <div className="text-red-500 text-sm font-bold flex items-center mt-2">
                            <AlertCircle className="w-4 h-4 mr-1" /> {importError}
                        </div>
                    )}
                </div>
            )}

            {/* Section 1: Project & Basic Info */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">1</span>
                    物件・プロジェクト情報
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    {/* Area Selection (Filter step 1) */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">エリア (Area) <span className="text-red-500">*</span></label>
                        <select
                            value={formData.area_id}
                            onChange={e => {
                                const val = e.target.value
                                setFormData({ ...formData, area_id: val, project_id: '' }) // Reset project when area changes
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
                            {areas.filter(a => a.region?.name !== 'Pattaya' && a.region?.name !== 'Sriracha').length > 0 && (
                                <optgroup label="Other">
                                    {areas.filter(a => a.region?.name !== 'Pattaya' && a.region?.name !== 'Sriracha').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Project Selection (Filter step 2 with react-select) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">プロジェクト（建物） <span className="text-red-500">*</span></label>
                            {formData.area_id && (
                                <button type="button" onClick={() => { setShowNewProjectForm(true); setFormData({ ...formData, project_id: 'new' }) }} className="text-[10px] font-bold text-navy-secondary hover:text-navy-primary transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full">
                                    + 見つからない場合新規登録
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
                                placeholder="プロジェクト名で検索（例: Riviera...）"
                                noOptionsMessage={() => "見つかりません。右上の「＋新規登録」から追加してください。"}
                                options={projects
                                    .filter(p => !formData.area_id || p.area_id === formData.area_id)
                                    .map(p => ({ value: p.id, label: p.name }))}
                                value={formData.project_id ? {
                                    value: formData.project_id,
                                    label: projects.find(p => p.id === formData.project_id)?.name || ''
                                } : null}
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
                                    control: (base) => ({
                                        ...base,
                                        padding: '0.6rem',
                                        borderRadius: '1rem',
                                        border: '1px solid #f1f5f9', // slate-100
                                        backgroundColor: '#f8fafc', // slate-50
                                        boxShadow: 'none',
                                        '&:hover': {
                                            borderColor: '#cbd5e1'
                                        }
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
                                        color: '#1e293b',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        borderRadius: '1rem',
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                        zIndex: 50
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        fontWeight: 'bold',
                                        color: '#94a3b8' // slate-400
                                    })
                                }}
                            />
                        )}
                    </div>

                    {showNewProjectForm && (
                        <div className="bg-slate-50 rounded-3xl p-8 border border-navy-primary/10 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-black text-navy-primary uppercase tracking-widest">新規プロジェクト情報</h4>
                                <button type="button" onClick={() => setShowNewProjectForm(false)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">キャンセル</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">建物名/プロジェクト名 <span className="text-red-500">*</span></label>
                                    <input type="text" value={projectForm.name} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, name: val }); setFormData({ ...formData, building_name: val, project_name: val, title: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary transition-all font-bold text-navy-secondary" placeholder="Riviera Jomtien" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">エリア <span className="text-red-500">*</span></label>
                                    <select value={projectForm.area_id} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, area_id: val }); setFormData({ ...formData, area_id: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary">
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
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイプ (Type)</label>
                                    <select value={projectForm.property_type} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, property_type: val }); setFormData({ ...formData, property_type: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl appearance-none font-bold">
                                        <option value="Condo">Condo</option><option value="House">House</option><option value="Townhouse">Townhouse</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">築年数</label>
                                    <input type="text" value={projectForm.year_built} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, year_built: val }); setFormData({ ...formData, year_built: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総階数</label>
                                    <input type="number" value={projectForm.total_floors} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, total_floors: val }); setFormData({ ...formData, total_floors: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                                <div className="h-auto p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                                    <CoordinatePicker lat={projectForm.latitude} lng={projectForm.longitude} onChange={(lat, lng) => setProjectForm({ ...projectForm, latitude: lat, longitude: lng })} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                        <button type="button" onClick={() => setFormData({ ...formData, is_for_rent: !formData.is_for_rent })} className={`px-8 py-3 rounded-xl text-sm font-black transition-all border-2 ${formData.is_for_rent ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>賃貸 (Rent)</button>
                        <button type="button" onClick={() => setFormData({ ...formData, is_for_sale: !formData.is_for_sale })} className={`px-8 py-3 rounded-xl text-sm font-black transition-all border-2 ${formData.is_for_sale ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>売買 (Sell)</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formData.is_for_rent && (
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">賃料 (THB) <span className="text-red-500">*</span></label>
                                <input type="number" value={formData.rent_price} onChange={e => setFormData({ ...formData, rent_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                            </div>
                        )}
                        {formData.is_for_sale && (
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">販売価格 (THB) <span className="text-red-500">*</span></label>
                                <input type="number" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                            </div>
                        )}
                    </div>

                    {!showNewProjectForm && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイプ {formData.project_id && <span className="text-[10px] text-navy-primary">(引用中{isAdmin && ' - 編集可'})</span>}</label>
                                <select
                                    disabled={!!formData.project_id && !isAdmin}
                                    value={formData.property_type}
                                    onChange={e => setFormData({ ...formData, property_type: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="Condo">コンド</option><option value="House">一軒家</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">築年数 {formData.project_id && <span className="text-[10px] text-navy-primary">(引用中{isAdmin && ' - 編集可'})</span>}</label>
                                <input
                                    disabled={!!formData.project_id && !isAdmin}
                                    type="text"
                                    value={formData.year_built}
                                    onChange={e => setFormData({ ...formData, year_built: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総階数 {formData.project_id && <span className="text-[10px] text-navy-primary">(引用中{isAdmin && ' - 編集可'})</span>}</label>
                                <input
                                    disabled={!!formData.project_id && !isAdmin}
                                    type="number"
                                    value={formData.total_floors}
                                    onChange={e => setFormData({ ...formData, total_floors: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">専有面積 (sqm)</label>
                            <input type="number" value={formData.sqm} onChange={e => setFormData({ ...formData, sqm: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">所在階</label>
                            <input type="text" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイトル (キャッチコピー) <span className="text-[10px] text-navy-primary font-bold">(AIインポートで自動入力されます)</span></label>
                        <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder="（例）オーシャンビューが魅力の〇〇コンドミニアム" />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">説明文 <span className="text-red-500">*</span></label>
                        <textarea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl resize-none font-medium" />
                    </div>
                </div>
            </div>

            {/* Section 2: Images */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">2</span>
                    画像ギャラリー
                </h3>
                <ImageUploader initialImages={existingImages} onImagesChange={(files) => setSelectedFiles(files)} />
            </div>

            {/* Section 3: Details & Settings */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">3</span>
                    こだわり条件 & 設定
                </h3>

                {mode === 'edit' && (
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">公開ステータス</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full md:w-1/2 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold disabled:opacity-50"
                            disabled={!isAdmin && !['published', 'under_negotiation', 'contracted'].includes(initialData?.status)}
                        >
                            <option value="draft">下書き (Draft)</option>
                            <option value="pending">承認待ち (Pending)</option>
                            <option value="published">公開中 (Published)</option>
                            <option value="under_negotiation">商談中 (Under Negotiation)</option>
                            <option value="contracted">成約済 (Contracted)</option>
                            <option value="expired">期限切れ (Expired)</option>
                        </select>
                        {!isAdmin && !['published', 'under_negotiation', 'contracted'].includes(initialData?.status) && (
                            <p className="text-xs text-amber-500 mt-2 ml-1">承認前のためステータスは変更できません。</p>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {JA_TAGS.map(tag => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-5 py-2.5 rounded-full text-xs font-black border-2 ${formData.tags.includes(tag) ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{tag}</button>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between p-10 bg-navy-secondary rounded-3xl text-white shadow-2xl flex-col md:flex-row gap-6">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><TagIcon className="w-6 h-6 text-white" /></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">掲載コスト</p><p className="text-xl font-black">1 クレジット / 物件</p></div>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => handleSubmit(e, 'draft')}
                        className="bg-white/10 hover:bg-white/20 border-2 border-transparent text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center disabled:opacity-50"
                    >
                        {loading && submitStatus === 'draft' ? <Loader2 className="animate-spin mr-2" /> : null}
                        下書き保存
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={(e) => handleSubmit(e, 'pending')}
                        className="bg-navy-primary hover:bg-indigo-600 border-2 border-navy-primary text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex items-center space-x-3 disabled:opacity-50"
                    >
                        {loading && submitStatus === 'pending' ? <Loader2 className="animate-spin" /> : <><span>物件を公開する</span><Plus /></>}
                    </button>
                </div>
            </div>

            <style jsx>{` @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } } .animate-progress-fast { animation: progress-fast 2s linear infinite; } `}</style>
        </form>
    )
}
