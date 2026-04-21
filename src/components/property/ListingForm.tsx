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
    ChevronRight,
    ArrowRight,
    Wind,
    Waves,
    Shield,
    Users,
    Car,
    Dumbbell,
    Baby,
    Tv,
    Coffee,
    Sparkles,
    Globe,
    Crown
} from 'lucide-react'
import { isPremium } from '@/lib/utils/plan'

import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Select from 'react-select'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'

const ImageUploader = dynamic(() => import('./ImageUploader'), {
    loading: () => <div className="border-2 border-dashed rounded-3xl p-10 text-center border-slate-100 bg-slate-50 animate-pulse h-[300px]" />,
    ssr: false
})

const CoordinatePicker = dynamic(() => import('./CoordinatePicker'), {
    loading: () => <div className="bg-slate-50 rounded-2xl h-64 animate-pulse border border-slate-100" />,
    ssr: false
})

import { getErrorMessage } from '@/lib/utils/errors'
import GoogleMapsShareLinkField from '@/components/property/GoogleMapsShareLinkField'
import { finiteCoord } from '@/lib/google-maps-url'
import { getPropertyTypeFieldLabel, getPropertyTypeOptionLabel } from '@/lib/property-type-i18n'

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
    total_units?: number | string
    developer?: string
    developer_id?: string
    latitude?: number
    longitude?: number
    google_place_id?: string | null
    google_maps_share_url?: string | null
}

interface ListingFormProps {
    initialData?: any
    mode?: 'create' | 'edit'
}

/** サイト言語（ルートの locale）に合わせた紹介文タブ */
function descriptionTabForLocale(loc: string): 'jp' | 'en' | 'th' {
    if (loc === 'en') return 'en'
    if (loc === 'th') return 'th'
    return 'jp'
}

export default function ListingForm({ initialData, mode = 'create' }: ListingFormProps) {
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const locale = typeof params?.locale === 'string' ? params.locale : 'jp'

    const [loading, setLoading] = useState(false)
    const [areas, setAreas] = useState<Area[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [developers, setDevelopers] = useState<{ id: string, name: string }[]>([])
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
        total_units: '',
        developer: '',
        developer_id: '',
        latitude: 12.9236,
        longitude: 100.8824,
        google_place_id: '',
        google_maps_share_url: ''
    })
    /** 管理者が「既存プロジェクト」選択時に地図・Place ID を編集して同期する */
    const [linkedProjectMap, setLinkedProjectMap] = useState<{
        google_place_id: string
        google_maps_share_url: string
        latitude: number
        longitude: number
    } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])

    const [submitStatus, setSubmitStatus] = useState<'pending' | 'draft'>('pending')
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [activeTab, setActiveTab] = useState<'jp' | 'en' | 'th'>(() => descriptionTabForLocale(locale))
    const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    const ui = locale === 'th'
        ? {
            upgradeOnly: 'ฟีเจอร์เฉพาะแพ็กเกจ Pro',
            upgradeBody: 'การลงประกาศแบบ Presale ใช้งานได้เฉพาะสมาชิก Pro เท่านั้น',
            viewPlan: 'ดูรายละเอียดแพ็กเกจ',
            close: 'ปิด',
            createdTitle: 'ลงประกาศสำเร็จ!',
            updatedTitle: 'อัปเดตสำเร็จ!',
            createdBody: 'เผยแพร่ข้อมูลทรัพย์เรียบร้อยแล้ว กำลังพาไปหน้าแดชบอร์ด...',
            updatedBody: 'อัปเดตข้อมูลทรัพย์เรียบร้อยแล้ว กำลังพาไปหน้าแดชบอร์ด...',
            section1: 'ข้อมูลทรัพย์ / โครงการ',
            section2: 'แกลเลอรีรูปภาพ',
            section3: 'เงื่อนไขและการตั้งค่า',
            area: 'พื้นที่',
            selectAreaFirst: 'กรุณาเลือกพื้นที่ก่อน',
            project: 'โครงการ (อาคาร)',
            projectNotFound: '+ หากไม่พบ ให้ลงทะเบียนใหม่',
            projectDisabledHint: 'เลือกพื้นที่ด้านบนก่อนจึงจะเลือกโครงการได้',
            newProjectMode: 'โหมดกรอกข้อมูลโครงการใหม่',
            sharedFacilities: 'สิ่งอำนวยความสะดวกส่วนกลาง',
            notRegistered: 'ยังไม่ได้ลงทะเบียน',
            rent: 'เช่า',
            sell: 'ขาย',
            presale: 'พรีเซล',
            rentPrice: 'ค่าเช่า (THB)',
            salePrice: 'ราคาขาย (THB)',
            title: 'ชื่อประกาศ (Catch Copy)',
            titlePlaceholder: 'เช่น คอนโดวิวทะเล โครงการ XXX',
            description: 'คำอธิบาย',
            generating: 'AI กำลังสร้างคำอธิบาย...',
            aiGenerate: 'สร้างด้วย AI',
            aiUnlock: 'ปลดล็อกฟีเจอร์ AI',
            aiNote: 'เมื่อสร้างคำอธิบายด้วย AI เนื้อหาปัจจุบันจะถูกแทนที่',
            status: 'สถานะการเผยแพร่',
            statusDraft: 'ฉบับร่าง',
            statusPending: 'รออนุมัติ',
            statusPublished: 'เผยแพร่',
            saveDraft: 'บันทึกฉบับร่าง',
            publish: 'เผยแพร่ประกาศ',
            propertyTypeNoteFromProject: 'จากโครงการ',
            propertyTypeNoteAdminExtra: '— แอดมินแก้ไขได้',
        }
        : locale === 'en'
            ? {
                upgradeOnly: 'Pro Plan Feature',
                upgradeBody: 'Presale listings are available for Pro members only.',
                viewPlan: 'View Plan Details',
                close: 'Close',
                createdTitle: 'Listed Successfully!',
                updatedTitle: 'Updated Successfully!',
                createdBody: 'Your property listing has been published. Redirecting to dashboard...',
                updatedBody: 'Your property listing has been updated. Redirecting to dashboard...',
                section1: 'Property / Project Information',
                section2: 'Image Gallery',
                section3: 'Preferences & Settings',
                area: 'Area',
                selectAreaFirst: 'Please select an area first',
                project: 'Project (Building)',
                projectNotFound: '+ Add new if not found',
                projectDisabledHint: 'Select an area above to enable project selection',
                newProjectMode: 'New project input mode',
                sharedFacilities: 'Shared Facilities',
                notRegistered: 'Not registered',
                rent: 'Rent',
                sell: 'Sell',
                presale: 'Pre-sale',
                rentPrice: 'Rent Price (THB)',
                salePrice: 'Sale Price (THB)',
                title: 'Listing Title (Catch Copy)',
                titlePlaceholder: 'e.g. Ocean-view condo in XXX project',
                description: 'Description',
                generating: 'AI is generating description...',
                aiGenerate: 'Generate with AI',
                aiUnlock: 'Unlock AI Feature',
                aiNote: 'Generating with AI will overwrite current content.',
                status: 'Publishing Status',
                statusDraft: 'Draft',
                statusPending: 'Pending',
                statusPublished: 'Published',
                saveDraft: 'Save Draft',
                publish: 'Publish Listing',
                propertyTypeNoteFromProject: 'from project',
                propertyTypeNoteAdminExtra: '— editable',
            }
            : {
                upgradeOnly: 'プロプラン限定機能',
                upgradeBody: '「プレセール物件」の掲載はプロプラン会員限定の機能です。',
                viewPlan: 'プラン詳細を見る',
                close: '閉じる',
                createdTitle: '掲載完了！',
                updatedTitle: '更新完了！',
                createdBody: '物件情報が正常に公開されました。ダッシュボードに移動します...',
                updatedBody: '物件情報が正常に更新されました。ダッシュボードに移動します...',
                section1: '物件・プロジェクト情報',
                section2: '画像ギャラリー',
                section3: 'こだわり条件 & 設定',
                area: 'エリア',
                selectAreaFirst: '先にエリアを選択してください',
                project: 'プロジェクト（建物）',
                projectNotFound: '+ 見つからない場合新規登録',
                projectDisabledHint: '※ 上の「エリア」を選択するとプロジェクトが選べるようになります',
                newProjectMode: '新規プロジェクト情報入力モード',
                sharedFacilities: 'このプロジェクトの共有施設',
                notRegistered: '未登録',
                rent: '賃貸',
                sell: '売買',
                presale: 'プレセール',
                rentPrice: '賃料 (THB)',
                salePrice: '販売価格 (THB)',
                title: '物件タイトル (キャッチコピー)',
                titlePlaceholder: '（例）オーシャンビューが魅力の〇〇コンドミニアム',
                description: '紹介文',
                generating: 'AIが紹介文を生成中...',
                aiGenerate: 'AIで生成',
                aiUnlock: 'AI機能を解放',
                aiNote: '※AI紹介文を生成すると、現在入力されている内容は上書きされます。',
                status: '公開ステータス',
                statusDraft: '下書き',
                statusPending: '承認待ち',
                statusPublished: '公開中',
                saveDraft: '下書き保存',
                publish: '物件を公開する',
                propertyTypeNoteFromProject: '引用中',
                propertyTypeNoteAdminExtra: '- 編集可',
            }

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

    const TAG_LABELS: Record<string, { en: string; th: string }> = {
        'バスタブあり': { en: 'Bathtub', th: 'อ่างอาบน้ำ' },
        'ウォシュレット完備': { en: 'Washlet', th: 'วอชเล็ต' },
        '洗濯機': { en: 'Washing Machine', th: 'เครื่องซักผ้า' },
        'テレビ': { en: 'TV', th: 'ทีวี' },
        '冷蔵庫': { en: 'Refrigerator', th: 'ตู้เย็น' },
        WiFi: { en: 'WiFi', th: 'WiFi' },
        'ペット可': { en: 'Pets Allowed', th: 'เลี้ยงสัตว์ได้' },
        'EV充電器あり': { en: 'EV Charger', th: 'แท่นชาร์จ EV' },
        '高層階': { en: 'High Floor', th: 'ชั้นสูง' },
        '築浅': { en: 'Recent Build', th: 'โครงการใหม่' },
        '格安': { en: 'Great Value', th: 'คุ้มราคา' },
        '高級物件': { en: 'Luxury', th: 'ทรัพย์หรู' },
        'バルコニー広い': { en: 'Large Balcony', th: 'ระเบียงกว้าง' },
        'オーシャンビュー': { en: 'Ocean View', th: 'วิวทะเล' },
        'シティービュー': { en: 'City View', th: 'วิวเมือง' },
    }

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

    const localizeTag = (value: string) =>
        locale === 'en' ? (TAG_LABELS[value]?.en ?? value) : locale === 'th' ? (TAG_LABELS[value]?.th ?? value) : value
    const localizeFacility = (value: string) =>
        locale === 'en' ? (FACILITY_LABELS[value]?.en ?? value) : locale === 'th' ? (FACILITY_LABELS[value]?.th ?? value) : value

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
        status: initialData?.status || 'pending',
        // Core specs
        property_type: initialData?.property_type || 'Condo',
        sqm: initialData?.sqm?.toString() || '',
        floor: initialData?.floor || '',
        bedrooms: initialData?.bedrooms?.toString() || '0',
        bathrooms: (initialData?.bathrooms && initialData.bathrooms > 0) ? initialData.bathrooms.toString() : '1',
        year_built: initialData?.year_built || '',
        total_floors: initialData?.total_floors?.toString() || '',
        total_units: initialData?.total_units?.toString() || '',
        developer: initialData?.developer || '',
        ownership_type: initialData?.ownership_type || '',
        is_presale: initialData?.is_presale || false,
        // Project facilities
        project_facilities: initialData?.project_facilities || [] as string[],
        // Multilingual descriptions
        description_en: initialData?.description_en || '',
        description_th: initialData?.description_th || ''
    })

    useEffect(() => {
        async function checkUserData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setIsAdmin(data?.is_admin || false)
                setCurrentUserProfile(data)
            }
        }
        checkUserData()
    }, [supabase])

    useEffect(() => {
        setActiveTab(descriptionTabForLocale(locale))
    }, [locale])

    useEffect(() => {
        const fetchInitialData = async () => {
            const [areasRes, projectsRes] = await Promise.all([
                supabase.from('areas').select('id, name, region:regions(name)').order('name'),
                supabase.from('projects').select('*, developers(name)').order('name')
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

    useEffect(() => {
        if (!formData.project_id || showNewProjectForm || formData.project_id === 'new') {
            setLinkedProjectMap(null)
            return
        }
        const p = projects.find((x) => x.id === formData.project_id)
        if (!p) {
            setLinkedProjectMap(null)
            return
        }
        setLinkedProjectMap({
            google_place_id: (p as Project).google_place_id || '',
            google_maps_share_url: (p as Project).google_maps_share_url || '',
            latitude: finiteCoord(p.latitude, 12.9236),
            longitude: finiteCoord(p.longitude, 100.8824),
        })
    }, [formData.project_id, showNewProjectForm, projects])

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

        const compressionOptions = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/webp'
        }

        for (const file of selectedFiles) {
            try {
                console.log(`Optimizing image: ${file.name}...`);
                const compressedFile = await imageCompression(file, compressionOptions);

                // Keep original extension or use .webp? Using .webp is better since we compressed to it.
                const fileName = `${Math.random().toString(36).substring(2)}.webp`
                const filePath = `${propertyId}/${fileName}`

                console.log(`Uploading optimized image: ${file.name} to ${filePath}...`);
                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, compressedFile, {
                        contentType: 'image/webp',
                        cacheControl: '3600'
                    })

                if (uploadError) {
                    console.error(`Upload failed for ${file.name}:`, uploadError);
                    throw new Error(`画像のアップロードに失敗しました (${file.name}): ${uploadError.message}`)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('property-images')
                    .getPublicUrl(filePath)

                uploadedUrls.push(publicUrl)
            } catch (error) {
                console.error('Image optimization/upload error:', error);
                throw error;
            }
        }

        return uploadedUrls
    }

    const handleGenerateAI = async () => {
        setIsGeneratingAI(true)
        try {
            const textToTranslate = `
物件名: ${formData.title}
価格: ${formData.is_for_rent ? `${formData.rent_price} THB/Month` : `${formData.sale_price} THB`}
エリア: ${areas.find(a => a.id === formData.area_id)?.name || ''}
間取り: ${formData.bedrooms} BR, ${formData.bathrooms} BA, ${formData.sqm} sqm
設備: ${[...formData.tags, ...formData.project_facilities].join(', ')}
開発業者: ${formData.developer}

上記の情報を元に、魅力的でわかりやすい不動産の紹介文を作成してください。
`;

            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToTranslate })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'AI紹介文の生成に失敗しました')

            setFormData(prev => ({
                ...prev,
                description: data.ja || prev.description,
                description_en: data.en || prev.description_en,
                description_th: data.th || prev.description_th
            }))

            setActiveTab(descriptionTabForLocale(locale))
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsGeneratingAI(false)
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

        // 新規で「物件を公開する」を押したときは status が pending のままだと一覧に出ない（要 published + 承認済み）
        if (mode === 'create' && statusOverride === 'pending') {
            finalStatus = 'published'
        }

        const publishFields =
            finalStatus === 'published' ? { is_approved: true as const } : {}

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
                        area_id: projectForm.area_id || null,
                        address: projectForm.address,
                        image_url: projectForm.image_url,
                        property_type: projectForm.property_type,
                        year_built: projectForm.year_built,
                        total_floors: projectForm.total_floors ? parseInt(projectForm.total_floors as string) : null,
                        total_units: projectForm.total_units ? parseInt(projectForm.total_units as string) : null,
                        developer_id: projectForm.developer_id || null,
                        latitude: projectForm.latitude,
                        longitude: projectForm.longitude,
                        google_place_id: projectForm.google_place_id?.trim() || null,
                        google_maps_share_url: projectForm.google_maps_share_url?.trim() || null,
                        facilities: formData.project_facilities
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
                        area_id: formData.area_id || null,
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
                        total_units: formData.total_units ? parseInt(formData.total_units) : null,
                        developer: formData.developer,
                        ownership_type: formData.is_for_sale ? formData.ownership_type : null,
                        is_presale: formData.is_presale,
                        description_en: formData.description_en,
                        description_th: formData.description_th,
                        ...publishFields,
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
                    area_id: formData.area_id || null,
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
                    total_units: formData.total_units ? parseInt(formData.total_units) : null,
                    ownership_type: formData.is_for_sale ? formData.ownership_type : null,
                    is_presale: formData.is_presale,
                    description_en: formData.description_en,
                    description_th: formData.description_th,
                    ...publishFields,
                })
                .eq('id', propertyId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

            // Sync project data if admin edited an existing project
            if (!showNewProjectForm && formData.project_id && isAdmin && linkedProjectMap) {
                const { error: projectSyncError } = await supabase
                    .from('projects')
                    .update({
                        property_type: formData.property_type,
                        year_built: formData.year_built,
                        total_floors: formData.total_floors ? parseInt(formData.total_floors as string) : null,
                        total_units: formData.total_units ? parseInt(formData.total_units as string) : null,
                        developer: formData.developer,
                        google_place_id: linkedProjectMap.google_place_id?.trim() || null,
                        google_maps_share_url: linkedProjectMap.google_maps_share_url?.trim() || null,
                        latitude: linkedProjectMap.latitude,
                        longitude: linkedProjectMap.longitude,
                    })
                    .eq('id', formData.project_id)

                if (projectSyncError) {
                    console.warn('Failed to sync project data:', projectSyncError)
                }
            }

            setSuccess(true)
            setTimeout(() => {
                const loc = typeof params?.locale === 'string' ? params.locale : 'jp'
                router.push(isAdmin ? `/${loc}/admin-secret` : `/${loc}/dashboard`)
            }, 2000)
        } catch (err: any) {
            console.error('Submit error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const UpgradeModal = () => (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-secondary/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />

                <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X className="w-6 h-6 text-slate-400" />
                </button>

                <div className="text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Crown className="w-10 h-10 text-amber-500" />
                    </div>

                    <h3 className="text-2xl font-black text-navy-secondary mb-4">{ui.upgradeOnly}</h3>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        {ui.upgradeBody}<br />
                        アップグレードして、投資価格の高い先行販売案件を独占的に掲載しましょう。
                    </p>

                    <div className="space-y-4">
                        <Link
                            href={`/${params.locale}/pricing`}
                            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-2xl shadow-lg shadow-amber-200 hover:shadow-xl transition-all active:scale-[0.98]"
                        >
                            {ui.viewPlan}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={() => setShowUpgradeModal(false)}
                            className="w-full py-4 text-slate-400 font-bold text-sm hover:text-navy-secondary transition-colors"
                        >
                            {ui.close}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (success) {
        return (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100">
                <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-emerald-600 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-navy-secondary mb-4">{mode === 'create' ? ui.createdTitle : ui.updatedTitle}</h2>
                <p className="text-slate-500 mb-8">{mode === 'create' ? ui.createdBody : ui.updatedBody}</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full animate-progress-fast"></div>
                </div>
            </div>
        )
    }

    return (
        <>
            <form onSubmit={(e) => handleSubmit(e, 'pending')} className="space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Section 1: Project & Basic Info */}
                <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                    <h3 className="text-xl font-black text-navy-secondary flex items-center">
                        <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">1</span>
                        {ui.section1}
                    </h3>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Area Selection (Filter step 1) */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.area} <span className="text-red-500">*</span></label>
                            <select
                                value={formData.area_id}
                                onChange={e => {
                                    const val = e.target.value
                                    setFormData({ ...formData, area_id: val, project_id: '' }) // Reset project when area changes
                                    setShowNewProjectForm(false)
                                }}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary appearance-none"
                            >
                                <option value="">{ui.selectAreaFirst}</option>
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
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{ui.project} <span className="text-red-500">*</span></label>
                                {formData.area_id && (
                                    <button type="button" onClick={() => { setShowNewProjectForm(true); setFormData({ ...formData, project_id: 'new' }) }} className="text-[10px] font-bold text-navy-secondary hover:text-navy-primary transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full">
                                        {ui.projectNotFound}
                                    </button>
                                )}
                            </div>

                            {!formData.area_id ? (
                                <div className="w-full px-5 py-4 bg-slate-50 opacity-50 border border-slate-100 rounded-2xl font-bold text-slate-400 text-sm">
                                    {ui.projectDisabledHint}
                                </div>
                            ) : showNewProjectForm ? (
                                <div className="w-full px-5 py-4 bg-navy-primary/5 border border-navy-primary/20 text-navy-primary rounded-2xl font-black text-sm text-center">
                                    {ui.newProjectMode}
                                </div>
                            ) : (
                                <Select
                                    isDisabled={!formData.area_id}
                                    placeholder="プロジェクト名で検索（例: Riviera...）"
                                    noOptionsMessage={() => "見つかりません。右上の「＋新規登録」から追加してください。"}
                                    options={projects
                                        .filter(p => !formData.area_id || p.area_id === formData.area_id)
                                        .map(p => ({
                                            value: p.id,
                                            label: params.locale === 'jp' && (p as any).name_jp
                                                ? `${p.name} (${(p as any).name_jp})`
                                                : p.name,
                                            // 検索用に正規化された文字列を持たせる（react-selectのデフォルト検索対象）
                                            searchLabel: `${p.name} ${(p as any).name_jp || ''}`.toLowerCase()
                                        }))}
                                    value={formData.project_id ? {
                                        value: formData.project_id,
                                        label: (() => {
                                            const p = projects.find(proj => proj.id === formData.project_id);
                                            if (!p) return '';
                                            return params.locale === 'jp' && (p as any).name_jp
                                                ? `${p.name} (${(p as any).name_jp})`
                                                : p.name;
                                        })()
                                    } : null}
                                    filterOption={(option, inputValue) => {
                                        const searchStr = (option.data as any).searchLabel;
                                        return searchStr.includes(inputValue.toLowerCase());
                                    }}
                                    onChange={(selectedOption) => {
                                        if (!selectedOption) {
                                            setFormData({ ...formData, project_id: '', building_name: '', title: '' })
                                            return
                                        }

                                        const val = selectedOption.value
                                        setShowNewProjectForm(false)
                                        const project = projects.find(p => p.id === val)
                                        // Extract developer name from joined developers table
                                        const developerName = (project as any)?.developers?.name || project?.developer || ''

                                        setFormData({
                                            ...formData,
                                            project_id: val,
                                            area_id: project?.area_id || formData.area_id,
                                            building_name: project?.name || formData.building_name,
                                            property_type: project?.property_type || formData.property_type,
                                            year_built: project?.year_built || formData.year_built,
                                            total_floors: project?.total_floors?.toString() || formData.total_floors,
                                            total_units: project?.total_units?.toString() || formData.total_units,
                                            developer: developerName || formData.developer,
                                            project_facilities: project?.facilities || [],
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

                            {/* Display facilities if project is selected and not in new project mode */}
                            {!showNewProjectForm && formData.project_id && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center">
                                        <Shield className="w-3 h-3 mr-2" />
                                        {ui.sharedFacilities}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.project_facilities?.length > 0 ? (
                                            formData.project_facilities.map((f: string) => (
                                                <span key={f} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-navy-secondary">
                                                    {localizeFacility(f)}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 italic ml-1">{ui.notRegistered}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && linkedProjectMap && !showNewProjectForm && formData.project_id && (
                            <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50/50 p-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-900">
                                    管理者: 紐づくプロジェクトの位置情報
                                </h4>
                                <GoogleMapsShareLinkField
                                    shareUrl={linkedProjectMap.google_maps_share_url}
                                    onShareUrlChange={(v) =>
                                        setLinkedProjectMap((prev) => (prev ? { ...prev, google_maps_share_url: v } : null))
                                    }
                                    onResolved={(data) =>
                                        setLinkedProjectMap((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      google_place_id:
                                                          data.google_place_id != null
                                                              ? data.google_place_id
                                                              : prev.google_place_id,
                                                      google_maps_share_url:
                                                          data.maps_share_url ?? prev.google_maps_share_url,
                                                      latitude: data.latitude ?? prev.latitude,
                                                      longitude: data.longitude ?? prev.longitude,
                                                  }
                                                : null
                                        )
                                    }
                                />
                                <CoordinatePicker
                                    lat={linkedProjectMap.latitude}
                                    lng={linkedProjectMap.longitude}
                                    googlePlaceId={linkedProjectMap.google_place_id}
                                    mapsShareUrl={linkedProjectMap.google_maps_share_url}
                                    placeNameHint={
                                        projects.find((p) => p.id === formData.project_id)?.name || formData.building_name
                                    }
                                    onChange={(lat, lng) =>
                                        setLinkedProjectMap((prev) =>
                                            prev ? { ...prev, latitude: lat, longitude: lng } : null
                                        )
                                    }
                                />
                            </div>
                        )}

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
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{getPropertyTypeFieldLabel(locale)}</label>
                                        <select value={projectForm.property_type} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, property_type: val }); setFormData({ ...formData, property_type: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl appearance-none font-bold">
                                            <option value="Condo">{getPropertyTypeOptionLabel('Condo', locale)}</option>
                                            <option value="House">{getPropertyTypeOptionLabel('House', locale)}</option>
                                            <option value="Townhouse">{getPropertyTypeOptionLabel('Townhouse', locale)}</option>
                                            <option value="Commercial">{getPropertyTypeOptionLabel('Commercial', locale)}</option>
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
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総戸数 (Units)</label>
                                        <input type="number" value={projectForm.total_units} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, total_units: val }); setFormData({ ...formData, total_units: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">デベロッパー</label>
                                        <input type="text" value={projectForm.developer} onChange={e => { const val = e.target.value; setProjectForm({ ...projectForm, developer: val }); setFormData({ ...formData, developer: val }); }} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                                    <div className="h-auto p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                                        <GoogleMapsShareLinkField
                                            shareUrl={projectForm.google_maps_share_url}
                                            onShareUrlChange={(v) =>
                                                setProjectForm((prev) => ({ ...prev, google_maps_share_url: v }))
                                            }
                                            onResolved={(data) =>
                                                setProjectForm((prev) => ({
                                                    ...prev,
                                                    google_place_id:
                                                        data.google_place_id != null ? data.google_place_id : prev.google_place_id,
                                                    google_maps_share_url:
                                                        data.maps_share_url ?? prev.google_maps_share_url,
                                                    latitude: data.latitude ?? prev.latitude,
                                                    longitude: data.longitude ?? prev.longitude,
                                                }))
                                            }
                                        />
                                        <CoordinatePicker
                                            lat={projectForm.latitude}
                                            lng={projectForm.longitude}
                                            googlePlaceId={projectForm.google_place_id}
                                            mapsShareUrl={projectForm.google_maps_share_url}
                                            placeNameHint={projectForm.name}
                                            onChange={(lat, lng) => setProjectForm({ ...projectForm, latitude: lat, longitude: lng })}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200">
                                    <label className="block text-xs font-black text-navy-primary uppercase tracking-widest mb-4 ml-1 flex items-center">
                                        <Shield className="w-4 h-4 mr-2" />
                                        共有施設 (Shared Facilities)
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {SHARED_FACILITIES.map(facility => {
                                            const isSelected = formData.project_facilities?.includes(facility)
                                            return (
                                                <button
                                                    key={facility}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            project_facilities: isSelected
                                                                ? prev.project_facilities.filter((f: string) => f !== facility)
                                                                : [...prev.project_facilities, facility]
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
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 items-center">
                            <button type="button" onClick={() => setFormData({ ...formData, is_for_rent: !formData.is_for_rent })} className={`px-8 py-3 rounded-xl text-sm font-black transition-all border-2 ${formData.is_for_rent ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{ui.rent} (Rent)</button>
                            <button type="button" onClick={() => setFormData({ ...formData, is_for_sale: !formData.is_for_sale })} className={`px-8 py-3 rounded-xl text-sm font-black transition-all border-2 ${formData.is_for_sale ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{ui.sell} (Sell)</button>

                            <div className="h-8 w-px bg-slate-100 hidden sm:block mx-2" />

                            <button
                                type="button"
                                onClick={() => {
                                    if (isPremium(currentUserProfile)) {
                                        setFormData({ ...formData, is_presale: !formData.is_presale })
                                    } else {
                                        setShowUpgradeModal(true)
                                    }
                                }}
                                className={`px-8 py-3 rounded-xl text-sm font-black transition-all border-2 flex items-center gap-2 ${formData.is_presale ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border-slate-100 text-slate-400'}`}
                            >
                                <Crown className={`w-4 h-4 ${formData.is_presale ? 'text-white' : 'text-amber-500'}`} />
                                {ui.presale} (Pre-sale)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {formData.is_for_rent && (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.rentPrice} <span className="text-red-500">*</span></label>
                                    <input type="number" value={formData.rent_price} onChange={e => setFormData({ ...formData, rent_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                                </div>
                            )}
                            {formData.is_for_sale && (
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.salePrice} <span className="text-red-500">*</span></label>
                                    <input type="number" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                                </div>
                            )}
                        </div>

                        {!showNewProjectForm && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        {getPropertyTypeFieldLabel(locale)}
                                        {formData.project_id && (
                                            <span className="text-[10px] text-navy-primary">
                                                ({ui.propertyTypeNoteFromProject}{isAdmin ? ` ${ui.propertyTypeNoteAdminExtra}` : ''})
                                            </span>
                                        )}
                                    </label>
                                    <select
                                        disabled={!!formData.project_id && !isAdmin}
                                        value={formData.property_type}
                                        onChange={e => setFormData({ ...formData, property_type: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="Condo">{getPropertyTypeOptionLabel('Condo', locale)}</option>
                                        <option value="House">{getPropertyTypeOptionLabel('House', locale)}</option>
                                        <option value="Townhouse">{getPropertyTypeOptionLabel('Townhouse', locale)}</option>
                                        <option value="Commercial">{getPropertyTypeOptionLabel('Commercial', locale)}</option>
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
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">総戸数 {formData.project_id && <span className="text-[10px] text-navy-primary">(引用中{isAdmin && ' - 編集可'})</span>}</label>
                                    <input
                                        disabled={!!formData.project_id && !isAdmin}
                                        type="number"
                                        value={formData.total_units}
                                        onChange={e => setFormData({ ...formData, total_units: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">デベロッパー {formData.project_id && <span className="text-[10px] text-navy-primary">(引用中{isAdmin && ' - 編集可'})</span>}</label>
                                    <input
                                        disabled={!!formData.project_id && !isAdmin}
                                        type="text"
                                        value={formData.developer}
                                        onChange={e => setFormData({ ...formData, developer: e.target.value })}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">間取り (Bedrooms)</label>
                                <select value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                    <option value="0">Studio</option>
                                    <option value="1">1 Bedroom</option>
                                    <option value="2">2 Bedrooms</option>
                                    <option value="3">3 Bedrooms</option>
                                    <option value="4">4 Bedrooms</option>
                                    <option value="5">5+ Bedrooms</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">バスルーム (Bathrooms)</label>
                                <select value={formData.bathrooms} onChange={e => setFormData({ ...formData, bathrooms: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                    <option value="1">1 Bathroom</option>
                                    <option value="2">2 Bathrooms</option>
                                    <option value="3">3 Bathrooms</option>
                                    <option value="4">4 Bathrooms</option>
                                    <option value="5">5+ Bathrooms</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.title}</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" placeholder={ui.titlePlaceholder} />
                        </div>

                        <div>
                            {/* Description with AI Assist */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className={`p-2 rounded-lg ${activeTab === 'jp' ? 'bg-navy-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-navy-secondary">{ui.description} {activeTab.toUpperCase()}</h3>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {(['jp', 'en', 'th'] as const).map((lang) => (
                                            <button
                                                key={lang}
                                                type="button"
                                                onClick={() => setActiveTab(lang)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === lang
                                                    ? 'bg-white text-navy-primary shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {lang.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative group min-h-[300px]">
                                    <AnimatePresence mode="wait">
                                        {isGeneratingAI ? (
                                            <motion.div
                                                key="skeleton"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="w-full px-6 py-8 bg-slate-50 border border-slate-100 rounded-3xl min-h-[300px] space-y-4"
                                            >
                                                <div className="h-4 bg-slate-200 rounded-full w-3/4 animate-pulse"></div>
                                                <div className="h-4 bg-slate-200 rounded-full w-full animate-pulse"></div>
                                                <div className="h-4 bg-slate-200 rounded-full w-5/6 animate-pulse"></div>
                                                <div className="h-4 bg-slate-200 rounded-full w-2/3 animate-pulse"></div>
                                                <div className="mt-8 flex items-center text-xs font-bold text-navy-primary animate-pulse">
                                                    <Sparkles className="w-3 h-3 mr-2 text-amber-500" />
                                                    {ui.generating}
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={{ duration: 0.2 }}
                                                className="relative h-full"
                                            >
                                                <textarea
                                                    value={activeTab === 'jp' ? formData.description : activeTab === 'en' ? formData.description_en : formData.description_th}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        [activeTab === 'jp' ? 'description' : activeTab === 'en' ? 'description_en' : 'description_th']: e.target.value
                                                    }))}
                                            placeholder={
                                                activeTab === 'jp'
                                                    ? '物件の魅力を詳しく記入してください...'
                                                    : activeTab === 'en'
                                                        ? 'Describe the property highlights in detail...'
                                                        : 'กรอกรายละเอียดจุดเด่นของทรัพย์...'
                                            }
                                                    className="w-full px-6 py-5 bg-white border border-slate-200 rounded-3xl min-h-[300px] focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all text-sm leading-relaxed"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* AI Assist Overlay/Button - Only show when NOT generating (or keep it as status) */}
                                    {!isGeneratingAI && (
                                        <div className="absolute bottom-4 right-4 z-20">
                                            {isPremium(currentUserProfile) ? (
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateAI}
                                                    disabled={isGeneratingAI || !formData.title}
                                                    className="bg-navy-primary hover:bg-navy-secondary text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 border border-white/10"
                                                >
                                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                                    {ui.aiGenerate} ({activeTab.toUpperCase()})
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUpgradeModal(true)}
                                                    className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                                >
                                                    <Crown className="w-4 h-4 text-amber-400" />
                                                    {ui.aiUnlock}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium px-4 mt-2">{ui.aiNote}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Images */}
                <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                    <h3 className="text-xl font-black text-navy-secondary flex items-center">
                        <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">2</span>
                        {ui.section2}
                    </h3>
                    <ImageUploader
                        initialImages={existingImages}
                        onImagesChange={(files) => setSelectedFiles(files)}
                        locale={locale}
                    />
                </div>

                {/* Section 3: Details & Settings */}
                <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                    <h3 className="text-xl font-black text-navy-secondary flex items-center">
                        <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">3</span>
                        {ui.section3}
                    </h3>

                    {mode === 'edit' && (
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.status}</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full md:w-1/2 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold disabled:opacity-50"
                                disabled={!isAdmin && !['published'].includes(initialData?.status)}
                            >
                                <option value="draft">{ui.statusDraft} (Draft)</option>
                                <option value="pending">{ui.statusPending} (Pending)</option>
                                <option value="published">{ui.statusPublished} (Published)</option>
                            </select>
                            {!isAdmin && !['published'].includes(initialData?.status) && (
                                <p className="text-xs text-amber-500 mt-2 ml-1">承認前のためステータスは変更できません。</p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        {JA_TAGS.map(tag => (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-5 py-2.5 rounded-full text-xs font-black border-2 ${formData.tags.includes(tag) ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{localizeTag(tag)}</button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end p-10 bg-navy-secondary rounded-3xl text-white shadow-2xl flex-col md:flex-row gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={(e) => handleSubmit(e, 'draft')}
                            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border-2 border-transparent text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center disabled:opacity-50"
                        >
                            {loading && submitStatus === 'draft' ? <Loader2 className="animate-spin mr-2" /> : null}
                            {ui.saveDraft}
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={(e) => handleSubmit(e, 'pending')}
                            className="w-full sm:w-auto bg-navy-primary hover:bg-indigo-600 border-2 border-navy-primary text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                        >
                            {loading && submitStatus === 'pending' ? <Loader2 className="animate-spin" /> : <><span>{ui.publish}</span><Plus /></>}
                        </button>
                    </div>
                </div>

                <style jsx>{` @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } } .animate-progress-fast { animation: progress-fast 2s linear infinite; } `}</style>
            </form>
            {showUpgradeModal && <UpgradeModal />}
        </>
    )
}
