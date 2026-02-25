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

const ImageUploader = dynamic(() => import('./ImageUploader'), {
    loading: () => <div className="border-2 border-dashed rounded-3xl p-10 text-center border-slate-100 bg-slate-50 animate-pulse h-[300px]" />,
    ssr: false
})

import { getErrorMessage } from '@/lib/utils/errors'

interface Area {
    id: string
    name: string
    region: { name: string }
}

interface ListingFormProps {
    initialData?: any
    mode?: 'create' | 'edit'
}

export default function ListingForm({ initialData, mode = 'create' }: ListingFormProps) {
    const [loading, setLoading] = useState(false)
    const [areas, setAreas] = useState<Area[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
    const router = useRouter()
    const supabase = createClient()

    // Japanese tags options
    const JA_TAGS = [
        'バスタブあり',
        'ウォシュレット完備',
        '洗濯機室内',
        '日本語対応スタッフ',
        '日本語テレビ対応',
        'ペット可',
        'EV充電器あり',
        '高層階（オーシャンビュー期待）',
        '駅近',
        '築浅',
        '格安',
        '高級物件',
        'バルコニー広い'
    ]

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        price: initialData?.price?.toString() || '',
        area_id: initialData?.area_id || '',
        listing_type: initialData?.listing_type || 'rent',
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
        // Core specs
        property_type: initialData?.property_type || 'Condo',
        sqm: initialData?.sqm?.toString() || '',
        floor: initialData?.floor || '',
        bedrooms: initialData?.bedrooms?.toString() || '0',
        bathrooms: initialData?.bathrooms?.toString() || '0',
        year_built: initialData?.year_built || '',
        total_floors: initialData?.total_floors?.toString() || ''
    })


    useEffect(() => {
        async function fetchAreas() {
            const { data, error } = await supabase
                .from('areas')
                .select('id, name, region:regions(name)')

            if (error) console.error('Error fetching areas:', error)
            if (data) {
                console.log('Fetched areas count:', data.length)
                setAreas(data as any)
            }
        }
        fetchAreas()
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
            if (tag === '日本語テレビ対応') nextData.has_japanese_tv = !isSelected
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

            // Debug log
            console.log(`Uploading: ${filePath}`)

            const { error: uploadError, data } = await supabase.storage
                .from('property-images')
                .upload(filePath, file)

            if (uploadError) {
                console.error('Supabase storage error:', uploadError)

                // If it's a "Bucket not found" error, provide a helpful message
                if (uploadError.message.includes('bucket not found') || (uploadError as any).status === 404) {
                    throw new Error('Supabase Storageに "property-images" バケットが見つかりません。SQLスクリプトを実行してバケットを作成してください。')
                }

                throw new Error(`画像のアップロードに失敗しました (${file.name}): ${uploadError.message}`)
            }

            // Get Public URL
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            let propertyId = initialData?.id

            // Step 1: Handling Property Record
            if (mode === 'create') {
                // For create, we insert first to get the real propertyId if needed, 
                // but since we want images to be part of the record, 
                // let's use a temporary ID or insert without images first.
                // Best pattern: Insert with placeholder/empty images, then upload, then update.

                const { data: newProperty, error: insertError } = await supabase
                    .from('properties')
                    .insert({
                        user_id: user.id,
                        title: formData.title,
                        description: formData.description,
                        price: parseFloat(formData.price),
                        area_id: formData.area_id,
                        listing_type: formData.listing_type,
                        images: [], // Placeholder
                        tags: formData.tags,
                        status: 'pending',
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        // Japanese specific fields
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
                        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null
                    })

                    .select()
                    .single()

                if (insertError) throw insertError
                propertyId = newProperty.id
            }

            // Step 2: Upload new images if any
            const newImageUrls = await uploadImages(propertyId)
            const finalImages = [...existingImages, ...newImageUrls]

            if (finalImages.length === 0) {
                throw new Error('少なくとも1枚の画像をアップロードしてください。')
            }

            // Step 3: Update property with final image list
            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    title: formData.title,
                    description: formData.description,
                    price: parseFloat(formData.price),
                    area_id: formData.area_id,
                    listing_type: formData.listing_type,
                    images: finalImages,
                    tags: formData.tags,
                    updated_at: new Date().toISOString(),
                    // Japanese specific fields
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
                    total_floors: formData.total_floors ? parseInt(formData.total_floors) : null
                })

                .eq('id', propertyId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            setSuccess(true)
            setTimeout(() => router.push('/dashboard'), 2000)
        } catch (err: any) {
            console.error('Submit error:', err)
            setError(getErrorMessage(err))
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
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Main Info */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">1</span>
                    基本情報
                </h3>

                <div className="flex bg-slate-50 p-1.5 rounded-2xl w-fit mb-8 border border-slate-100">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listing_type: 'rent' })}
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${formData.listing_type === 'rent' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                    >
                        賃貸 (Rent)
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, listing_type: 'sell' })}
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${formData.listing_type === 'sell' ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                    >
                        売買 (Sell)
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイトル <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                            placeholder="例: Riviera Jomtien (リビエラ・ジョムティエン)"
                            onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('タイトルを入力してください')}
                            onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                        />

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {formData.listing_type === 'sell' ? '販売価格' : '賃料 / 月'} (THB) <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                                placeholder="25000"
                                onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('価格を入力してください')}
                                onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                            />

                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">エリア <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.area_id}
                                onChange={e => setFormData({ ...formData, area_id: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary appearance-none"
                                onInvalid={e => (e.target as HTMLSelectElement).setCustomValidity('エリアを選択してください')}
                                onInput={e => (e.target as HTMLSelectElement).setCustomValidity('')}
                            >
                                <option value="">選択してください</option>
                                {Object.entries(
                                    areas.reduce((acc, area) => {
                                        const regionName = area.region?.name || 'Other'
                                        if (!acc[regionName]) acc[regionName] = []
                                        acc[regionName].push(area)
                                        return acc
                                    }, {} as Record<string, Area[]>)
                                ).map(([region, regionAreas]) => (
                                    <optgroup key={region} label={region}>
                                        {regionAreas.map(area => (
                                            <option key={area.id} value={area.id}>
                                                {area.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">物件タイプ <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.property_type}
                                onChange={e => setFormData({ ...formData, property_type: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary appearance-none"
                            >
                                <option value="Condo">コンドミニアム</option>
                                <option value="Apartment">アパート</option>
                                <option value="House">一軒家 / ヴィラ</option>
                                <option value="Townhouse">タウンハウス</option>
                                <option value="Land">土地</option>
                                <option value="Commercial">商業用</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">専有面積 (sqm) <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={formData.sqm}
                                onChange={e => setFormData({ ...formData, sqm: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                                placeholder="45.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">所在階</label>
                            <input
                                type="text"
                                value={formData.floor}
                                onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                                placeholder="例: 15 (または 15+)"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">築年数 (竣工年)</label>
                            <input
                                type="text"
                                value={formData.year_built}
                                onChange={e => setFormData({ ...formData, year_built: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                                placeholder="例: 2020年 (または 築3年)"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総階数 (何階建てか)</label>
                            <input
                                type="number"
                                value={formData.total_floors}
                                onChange={e => setFormData({ ...formData, total_floors: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                                placeholder="例: 45"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">寝室数 (Bedroom)</label>
                            <div className="flex bg-slate-50 rounded-2xl p-1 border border-slate-100">
                                {['0', '1', '2', '3', '4+'].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, bedrooms: num })}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${formData.bedrooms === num ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                                    >
                                        {num === '0' ? 'Studio' : num}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">浴室数 (Bathroom)</label>
                            <div className="flex bg-slate-50 rounded-2xl p-1 border border-slate-100">
                                {['1', '2', '3+'].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, bathrooms: num })}
                                        className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${formData.bathrooms === num ? 'bg-navy-primary text-white shadow-lg' : 'text-slate-400 hover:text-navy-primary'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">説明文 <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-medium text-navy-secondary resize-none"
                            placeholder="物件の魅力や詳細について入力してください"
                            onInvalid={e => (e.target as HTMLTextAreaElement).setCustomValidity('説明文を入力してください')}
                            onInput={e => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                        />

                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-sm font-black text-navy-secondary uppercase tracking-widest mb-6 flex items-center">
                        水回り・付帯設備
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">給湯器タイプ</label>
                            <input
                                type="text"
                                value={formData.water_heater_type}
                                onChange={e => setFormData({ ...formData, water_heater_type: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                                placeholder="例: 電気タンク式 / 個別給湯"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-sm font-black text-navy-secondary uppercase tracking-widest mb-6 flex items-center">
                        生活コスト・インフラ
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">電気代支払い形態</label>
                            <select
                                value={formData.electricity_bill_type}
                                onChange={e => setFormData({ ...formData, electricity_bill_type: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none appearance-none"
                            >
                                <option value="Direct">Direct（電力会社直）</option>
                                <option value="Condo Rate">Condo Rate（割増あり）</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">水道代目安</label>
                            <input
                                type="text"
                                value={formData.water_bill_desc}
                                onChange={e => setFormData({ ...formData, water_bill_desc: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                                placeholder="例: 月額300B固定、または実費"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ネット環境</label>
                            <input
                                type="text"
                                value={formData.internet_desc}
                                onChange={e => setFormData({ ...formData, internet_desc: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                                placeholder="例: AIS Fibre完備、または個別契約"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-sm font-black text-navy-secondary uppercase tracking-widest mb-6 flex items-center">
                        周辺環境・アクセス
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">最寄り日本食スーパーまで</label>
                            <input
                                type="text"
                                value={formData.distance_to_supermarket}
                                onChange={e => setFormData({ ...formData, distance_to_supermarket: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                                placeholder="例: 徒歩5分、車で10分"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">騒音レベル (1-5)</label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={formData.noise_level}
                                onChange={e => setFormData({ ...formData, noise_level: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-navy-primary mt-4"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
                                <span>静か (1)</span>
                                <span>普通 (3)</span>
                                <span>賑やか (5)</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">送迎・公共交通</label>
                            <input
                                type="text"
                                value={formData.transportation_desc}
                                onChange={e => setFormData({ ...formData, transportation_desc: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none"
                                placeholder="例: ソンテウ巡回ルート沿い"
                            />
                        </div>
                    </div>
                </div>


                <div className="pt-8 border-t border-slate-50">
                    <h4 className="text-sm font-black text-navy-secondary uppercase tracking-widest mb-4 flex items-center">
                        管理者メモ (内部用)
                    </h4>
                    <textarea
                        rows={2}
                        value={formData.admin_memo}
                        onChange={e => setFormData({ ...formData, admin_memo: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-medium text-navy-secondary resize-none"
                        placeholder="在住者視点のコメントや注意点（※詳細ページに表示されます）"
                    />
                </div>
            </div>


            {/* Images */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">2</span>
                    画像ギャラリー
                </h3>

                <ImageUploader
                    initialImages={existingImages}
                    onImagesChange={(files) => setSelectedFiles(files)}
                />
            </div>

            {/* Tags */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">3</span>
                    こだわり条件（タグ）
                </h3>

                <div className="flex flex-wrap gap-3">
                    {JA_TAGS.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-5 py-2.5 rounded-full text-xs font-black transition-all border-2 ${formData.tags.includes(tag)
                                ? 'bg-navy-primary border-navy-primary text-white shadow-md'
                                : 'bg-white border-slate-100 text-slate-400 hover:border-navy-primary/30 hover:text-navy-primary'
                                }`}
                        >
                            <span className="flex items-center space-x-1">
                                {formData.tags.includes(tag) && <Plus className="w-3 h-3 rotate-45" />}
                                <span>{tag}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-10 bg-navy-secondary rounded-3xl text-white shadow-2xl">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <TagIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">掲載コスト</p>
                        <p className="text-xl font-black text-white">1 クレジット / 物件</p>
                    </div>
                </div>
                <button
                    disabled={loading}
                    className="w-full md:w-auto bg-navy-primary hover:bg-navy-secondary border-2 border-navy-primary text-white px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <span>物件を公開する</span>
                            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        </>
                    )}
                </button>
            </div>

            <style jsx>{`
        @keyframes progress-fast {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-fast {
          animation: progress-fast 2s linear infinite;
        }
      `}</style>
        </form>
    )
}
