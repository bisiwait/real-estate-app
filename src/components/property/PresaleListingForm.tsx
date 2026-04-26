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
    Wallet,
    Shield,
    Sparkles,
    Loader2 as LoaderIcon,
    ChevronDown,
    Link2,
    DollarSign,
    Settings2
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Select from 'react-select'
import imageCompression from 'browser-image-compression'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import GoogleMapsShareLinkField from '@/components/property/GoogleMapsShareLinkField'
import { finiteCoord } from '@/lib/google-maps-url'
import { getPropertyTypeFieldLabel, getPropertyTypeOptionLabel } from '@/lib/property-type-i18n'
import { checkPropertySaveDuplicates } from '@/lib/supabase/property-save-duplicate-guard'

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
    total_units?: number | string
    developer?: string
    developer_id?: string
    facilities?: string[]
    latitude?: number
    longitude?: number
    google_place_id?: string | null
    google_maps_share_url?: string | null
}

interface PresaleListingFormProps {
    initialData?: any
    mode?: 'create' | 'edit'
}

export default function PresaleListingForm({ initialData, mode = 'create' }: PresaleListingFormProps) {
    const params = useParams()
    const router = useRouter()
    const locale = typeof params?.locale === 'string' ? params.locale : 'jp'
    const ui = locale === 'th'
        ? {
            uploadFailed: 'อัปโหลดรูปภาพไม่สำเร็จ',
            requiredProjectAndArea: 'กรุณาระบุชื่อโครงการและพื้นที่',
            requiredSalePrice: 'ราคาพรีเซล (ราคาขาย) เป็นข้อมูลจำเป็น',
            requiredAtLeastOneImage: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป',
            successCreate: 'ลงประกาศพรีเซลสำเร็จ!',
            successUpdate: 'อัปเดตสำเร็จ!',
            movingToDashboard: 'กำลังย้ายไปหน้าแดชบอร์ด...',
            modeTitle: 'โหมดลงประกาศพรีเซล',
            modeDesc: 'ประกาศจากฟอร์มนี้จะแสดงเป็นโครงการพรีเซล (ก่อนสร้างเสร็จ) พร้อมป้ายและข้อมูลกำหนดการ โดยเป็นประกาศเพื่อขายเท่านั้น',
            sectionProjectInfo: 'ข้อมูลพื้นฐานโครงการ',
            areaLabel: 'พื้นที่ (Area)',
            selectAreaFirst: 'กรุณาเลือกพื้นที่ก่อน',
            projectName: 'ชื่อโครงการ',
            addAsNewProject: '+ ลงทะเบียนเป็นโครงการใหม่',
            selectAreaToChooseProject: 'เมื่อเลือก "พื้นที่" ด้านบนแล้ว จะสามารถเลือกโครงการได้',
            newProjectMode: 'โหมดกรอกข้อมูลโครงการใหม่',
            searchProject: 'ค้นหาชื่อโครงการ...',
            projectNotFound: 'ไม่พบโครงการ กรุณาเพิ่มจาก "＋ลงทะเบียนใหม่" ด้านขวาบน',
            projectFacilities: 'สิ่งอำนวยความสะดวกของโครงการนี้',
            notRegistered: 'ยังไม่ได้ลงทะเบียน',
            priceLabel: 'ราคาพรีเซล (THB)',
            ownershipLabel: 'กรรมสิทธิ์ (Ownership)',
            pricePerSqm: 'ราคาต่อ ตร.ม. (Price per SQM)',
            autoCalculated: 'คำนวณอัตโนมัติ',
            areaSqm: 'พื้นที่ใช้สอย (sqm)',
            bedroomPlan: 'รูปแบบห้อง (Bedrooms)',
            sectionPresaleDetails: 'รายละเอียดพรีเซล (Pro)',
            completionSchedule: 'กำหนดแล้วเสร็จ (ปีที่คาดว่าจะเสร็จ)',
            completionPlaceholder: 'เช่น: ธ.ค. 2026 หรือ 2026',
            landArea: 'ขนาดที่ดิน',
            constructionStatus: 'สถานะการก่อสร้าง',
            planning: 'วางแผน (Planning)',
            underConstruction: 'กำลังก่อสร้าง (Under Construction)',
            completed: 'เสร็จแล้ว (Completed)',
            totalUnits: 'จำนวนยูนิตทั้งหมด',
            totalBuildings: 'จำนวนอาคาร',
            paymentPlan: 'หมายเหตุแผนการชำระเงิน/ผลตอบแทน',
            appealPoints: 'จุดเด่นและจุดขายของโครงการ',
            aiWriting: 'AI กำลังเขียน...',
            aiGenerate: 'สร้างคำอธิบาย 3 ภาษา ด้วย AI',
            aiGeneratingDesc: 'AI กำลังเขียนคำอธิบายโครงการที่น่าสนใจ...',
            jpTab: 'ภาษาญี่ปุ่น (JP)',
            sectionAdvanced: 'ตั้งค่ารายละเอียดสำหรับนักลงทุน',
            sectionAdvancedSub: 'สิ่งอำนวยความสะดวก / URL โชว์รูม / รายละเอียดโควตา (ไม่บังคับ)',
            amenities: 'สิ่งอำนวยความสะดวก (Amenities)',
            selectedCount: 'รายการที่เลือก',
            showroomMapUrl: 'Google Map URL ของโชว์รูม',
            showroomMapHint: 'วาง URL ที่คัดลอกจาก Google Maps โดยเลือก "แชร์" -> "คัดลอกลิงก์"',
            quotaDetails: 'รายละเอียดโควตาต่างชาติ',
            sectionImages: 'รูปโครงการ (ภาพเรนเดอร์/ภาพจำลอง ฯลฯ)',
            publishPresale: 'เผยแพร่พรีเซล',
            developerNameNote: 'ระบบจะกรอกให้อัตโนมัติเมื่อเลือกโครงการ คุณสามารถแก้ไขชื่อที่จะใช้ในคำอธิบายจาก AI ได้',
            paymentPlanPlaceholder: 'เช่น ค่าจอง 100,000 บาท, 20% ตอนทำสัญญา, 30% ระหว่างก่อสร้าง, 50% ตอนโอนกรรมสิทธิ์ (ผลตอบแทนคาดการณ์รับประกัน 7%)',
            quotaForeignDesc: 'ชาวต่างชาติสามารถถือกรรมสิทธิ์ได้โดยตรง สูงสุด 49% ของพื้นที่ขายรวมทั้งอาคาร',
            quotaThaiDesc: 'ถือกรรมสิทธิ์ในชื่อนิติบุคคลไทย หรือเช่าระยะยาว (30 ปี + 30 ปี)',
            quotaCompanyDesc: 'ถือกรรมสิทธิ์ในนามบริษัทไทย ต้องมีการจัดการภาษีอย่างเหมาะสม',
            developerNameLabel: 'ชื่อผู้พัฒนา (Developer)',
            developerLabel: 'ผู้พัฒนา',
            selectDeveloper: 'เลือกผู้พัฒนา',
        }
        : locale === 'en'
            ? {
                uploadFailed: 'Image upload failed',
                requiredProjectAndArea: 'Project name and area are required.',
                requiredSalePrice: 'Presale price (sale price) is required.',
                requiredAtLeastOneImage: 'Please upload at least one image.',
                successCreate: 'Presale listing published!',
                successUpdate: 'Updated successfully!',
                movingToDashboard: 'Redirecting to dashboard...',
                modeTitle: 'Presale listing mode',
                modeDesc: 'Listings created from this form are shown as presale (pre-completion) projects with dedicated badges and schedule info. Sale only.',
                sectionProjectInfo: 'Project basic information',
                areaLabel: 'Area',
                selectAreaFirst: 'Please select an area first',
                projectName: 'Project name',
                addAsNewProject: '+ Register as a new project',
                selectAreaToChooseProject: 'Select "Area" above to enable project selection',
                newProjectMode: 'New project input mode',
                searchProject: 'Search project name...',
                projectNotFound: 'No project found. Add one from "+ New registration" at top right.',
                projectFacilities: 'Shared facilities for this project',
                notRegistered: 'Not registered',
                priceLabel: 'Presale price (THB)',
                ownershipLabel: 'Ownership',
                pricePerSqm: 'Price per SQM',
                autoCalculated: 'Auto-calculated',
                areaSqm: 'Area (sqm)',
                bedroomPlan: 'Layout (Bedrooms)',
                sectionPresaleDetails: 'Presale details (Pro)',
                completionSchedule: 'Estimated completion date (year)',
                completionPlaceholder: 'e.g. Dec 2026 or 2026',
                landArea: 'Land area',
                constructionStatus: 'Current construction status',
                planning: 'Planning',
                underConstruction: 'Under Construction',
                completed: 'Completed',
                totalUnits: 'Total units',
                totalBuildings: 'Total buildings',
                paymentPlan: 'Payment schedule / yield notes',
                appealPoints: 'Project highlights / selling points',
                aiWriting: 'AI writing...',
                aiGenerate: 'Generate 3-language descriptions with AI',
                aiGeneratingDesc: 'AI is writing engaging property descriptions...',
                jpTab: 'Japanese (JP)',
                sectionAdvanced: 'Advanced investor settings',
                sectionAdvancedSub: 'Amenities / showroom URL / quota details (optional)',
                amenities: 'Amenities',
                selectedCount: 'selected',
                showroomMapUrl: 'Showroom Google Map URL',
                showroomMapHint: 'Paste the URL copied from Google Maps via "Share" -> "Copy link".',
                quotaDetails: 'Foreign quota details',
                sectionImages: 'Project images (renderings / perspectives)',
                publishPresale: 'Publish presale',
                developerNameNote: 'Auto-filled when a project is selected. You can edit the name used in AI-generated descriptions.',
                paymentPlanPlaceholder: 'e.g. THB 100,000 booking fee, 20% on contract, 30% during construction, 50% on completion. Estimated guaranteed yield: 7%.',
                quotaForeignDesc: 'Foreign buyers can hold title directly, up to 49% of the building’s total saleable area.',
                quotaThaiDesc: 'Held under a Thai national name or via long-term lease (30 years + 30 years).',
                quotaCompanyDesc: 'Held under a Thai company name; proper tax administration is required.',
                developerNameLabel: 'Developer name',
                developerLabel: 'Developer',
                selectDeveloper: 'Select developer',
            }
            : {
                uploadFailed: '画像のアップロードに失敗しました',
                requiredProjectAndArea: 'プロジェクト名とエリアは必須です。',
                requiredSalePrice: 'プレセール価格（販売価格）は必須です。',
                requiredAtLeastOneImage: '少なくとも1枚の画像をアップロードしてください。',
                successCreate: 'プレセール案件掲載完了！',
                successUpdate: '更新完了！',
                movingToDashboard: 'ダッシュボードに移動します...',
                modeTitle: 'プレセール物件登録モード',
                modeDesc: 'このフォームから登録された物件は「プレセール（完成前）プロジェクト」として、専用のバッジやスケジュール情報と共に表示されます。販売専用となります。',
                sectionProjectInfo: 'プロジェクト基本情報',
                areaLabel: 'エリア (Area)',
                selectAreaFirst: '先にエリアを選択してください',
                projectName: 'プロジェクト名',
                addAsNewProject: '+ 新規プロジェクトとして登録',
                selectAreaToChooseProject: '※ 上の「エリア」を選択するとプロジェクトが選べるようになります',
                newProjectMode: '新規プロジェクト情報入力モード',
                searchProject: 'プロジェクト名で検索...',
                projectNotFound: '見つかりません。右上の「＋新規登録」から追加してください。',
                projectFacilities: 'このプロジェクトの共有施設',
                notRegistered: '未登録',
                priceLabel: 'プレセール価格 (THB)',
                ownershipLabel: '所有権 (Ownership)',
                pricePerSqm: '平米単価（Price per SQM）',
                autoCalculated: '自動計算',
                areaSqm: '専有面積 (sqm)',
                bedroomPlan: '想定間取り (Bedrooms)',
                sectionPresaleDetails: 'プレセール詳細 (Pro)',
                completionSchedule: '竣工予定時期 (完成年)',
                completionPlaceholder: '2026年12月 または 2026',
                landArea: '敷地面積',
                constructionStatus: '現在の建設状況',
                planning: '計画中 (Planning)',
                underConstruction: '建設中 (Under Construction)',
                completed: '完成済 (Completed)',
                totalUnits: '総戸数',
                totalBuildings: '棟数',
                paymentPlan: '支払いスケジュール・利回り等の補足',
                appealPoints: 'プロジェクトの魅力・アピールポイント',
                aiWriting: 'AI執筆中...',
                aiGenerate: 'AIで3ヶ国語紹介文を作成',
                aiGeneratingDesc: 'AIが魅力的な紹介文を執筆中...',
                jpTab: '日本語 (JP)',
                sectionAdvanced: '投資家向け詳細設定',
                sectionAdvancedSub: 'アメニティ・ショールームURL・Quota詳細（任意）',
                amenities: '共有設備・アメニティ (Amenities)',
                selectedCount: '件選択中',
                showroomMapUrl: 'ショールームのGoogle Map URL',
                showroomMapHint: '※ Google マップで「共有」→「リンクをコピー」から取得したURLを貼り付けてください。',
                quotaDetails: '外国人枠（Quota）詳細',
                sectionImages: 'プロジェクト画像（完成予想図・パース等）',
                publishPresale: 'プレセールを公開',
                developerNameNote: '※ プロジェクト選択時に自動入力されます。AI紹介文に反映させる名前を編集できます。',
                paymentPlanPlaceholder: '予約金10万バーツ、契約時20%、建設中30%、完成時50%。想定利回り7%保証。',
                quotaForeignDesc: '外国人が直接名義取得可。ビル全体の49%まで。',
                quotaThaiDesc: 'タイ人名義または長期リース（30年+30年）。',
                quotaCompanyDesc: 'タイ法人設立で名義取得。税務管理が必要。',
                developerNameLabel: 'デベロッパー名 (Developer)',
                developerLabel: 'デベロッパー',
                selectDeveloper: 'デベロッパーを選択',
            }
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    const [areas, setAreas] = useState<Area[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [developers, setDevelopers] = useState<{ id: string, name: string }[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [showNewProjectForm, setShowNewProjectForm] = useState(false)

    const [projectForm, setProjectForm] = useState({
        name: '',
        area_id: '',
        address: '',
        property_type: 'Condo',
        year_built: '',
        total_floors: '',
        total_units: '',
        total_buildings: '',
        developer: '',
        developer_id: '',
        latitude: 12.9236,
        longitude: 100.8824,
        google_place_id: '',
        google_maps_share_url: ''
    })
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
    const SHARED_FACILITY_LABELS: Record<string, { en: string; th: string }> = {
        プール: { en: 'Pool', th: 'สระว่ายน้ำ' },
        インフィニティプール: { en: 'Infinity Pool', th: 'สระว่ายน้ำอินฟินิตี้' },
        サウナ: { en: 'Sauna', th: 'ซาวน่า' },
        フィットネス: { en: 'Fitness', th: 'ฟิตเนส' },
        スカイラウンジ: { en: 'Sky Lounge', th: 'สกายเลานจ์' },
        多目的ルーム: { en: 'Multi-purpose Room', th: 'ห้องอเนกประสงค์' },
        キッズルーム: { en: "Kids' Room", th: 'ห้องเด็ก' },
        レストラン: { en: 'Restaurant', th: 'ร้านอาหาร' },
        EV充電器: { en: 'EV Charger', th: 'ที่ชาร์จรถ EV' },
        オートロック: { en: 'Auto-lock', th: 'ระบบล็อกอัตโนมัติ' },
        '24Hセキュリティ': { en: '24H Security', th: 'ระบบรักษาความปลอดภัย 24 ชม.' },
        コンシェルジュ: { en: 'Concierge', th: 'คอนเซียร์จ' },
        駐車場: { en: 'Parking', th: 'ที่จอดรถ' },
        WiFi: { en: 'Wi-Fi', th: 'Wi-Fi' },
        シャトルサービス: { en: 'Shuttle Service', th: 'บริการรถรับส่ง' },
    }
    const getSharedFacilityLabel = (facility: string) => {
        const mapped = SHARED_FACILITY_LABELS[facility]
        if (!mapped) return facility
        if (locale === 'en') return mapped.en
        if (locale === 'th') return mapped.th
        return facility
    }

    const [activeTab, setActiveTab] = useState<'jp' | 'en' | 'th'>('jp')
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        is_for_rent: false,
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
        has_japanese_tv: initialData?.has_japanese_tv || false,
        // Project facilities
        project_facilities: initialData?.project_facilities || [] as string[],
        // Multilingual descriptions
        description_en: initialData?.description_en || '',
        description_th: initialData?.description_th || '',
        // Advanced investor fields
        showroom_map_url: initialData?.showroom_map_url || '',
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
            const [areasRes, projectsRes, developersRes] = await Promise.all([
                supabase.from('areas').select('id, name, region:regions(name)').order('name'),
                supabase.from('projects').select('*, developers(name)').order('name'),
                supabase.from('developers').select('id, name').order('name')
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
            if (projectsRes.data) setProjects(projectsRes.data)
            if (developersRes.data) setDevelopers(developersRes.data)
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
            google_place_id: p.google_place_id || '',
            google_maps_share_url: p.google_maps_share_url || '',
            latitude: finiteCoord(p.latitude, 12.9236),
            longitude: finiteCoord(p.longitude, 100.8824),
        })
    }, [formData.project_id, showNewProjectForm, projects])

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
                const compressedFile = await imageCompression(file, compressionOptions);
                const fileName = `${Math.random().toString(36).substring(2)}.webp`
                const filePath = `${propertyId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filePath, compressedFile, {
                        contentType: 'image/webp',
                        cacheControl: '3600'
                    })

                if (uploadError) {
                    throw new Error(`${ui.uploadFailed} (${file.name}): ${uploadError.message}`)
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) throw new Error('Unauthorized')

            const dup = await checkPropertySaveDuplicates(supabase, {
                title: formData.title,
                excludePropertyId: mode === 'edit' ? initialData?.id ?? null : null,
                description: formData.description,
                checkDescriptionPrefix: true,
            })
            if (!dup.ok) throw new Error(dup.message)

            const targetStatus =
                mode === 'edit'
                    ? (initialData?.status || (isAdmin ? 'published' : 'pending'))
                    : (isAdmin ? 'published' : 'pending')
            const targetApproved =
                mode === 'edit'
                    ? (typeof initialData?.is_approved === 'boolean' ? initialData.is_approved : isAdmin)
                    : isAdmin

            let finalProjectId = formData.project_id

            if (showNewProjectForm) {
                if (!projectForm.name || !formData.area_id) {
                    throw new Error(ui.requiredProjectAndArea)
                }
                const { data: newProject, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                        name: projectForm.name,
                        area_id: formData.area_id || null,
                        address: projectForm.address,
                        property_type: projectForm.property_type,
                        year_built: projectForm.year_built,
                        total_floors: projectForm.total_floors ? parseInt(projectForm.total_floors as string) : null,
                        total_units: projectForm.total_units ? parseInt(projectForm.total_units as string) : null,
                        total_buildings: projectForm.total_buildings ? parseInt(projectForm.total_buildings as string) : null,
                        developer: projectForm.developer,
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

            if (!formData.sale_price) {
                throw new Error(ui.requiredSalePrice)
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
                        area_id: formData.area_id || null,
                        project_id: finalProjectId || null,
                        building_name: formData.building_name,
                        project_name: formData.project_name,
                        images: [],
                        tags: formData.tags,
                        status: targetStatus,
                        is_approved: targetApproved,
                        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        property_type: formData.property_type,
                        sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                        floor: formData.floor,
                        bedrooms: parseInt(formData.bedrooms),
                        bathrooms: parseInt(formData.bathrooms),
                        year_built: formData.year_built,
                        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                        ownership_type: formData.ownership_type,
                        is_presale: true,
                        completion_date: formData.completion_date,
                        payment_plan: formData.payment_plan,
                        construction_status: formData.construction_status,
                        land_area: formData.land_area,
                        total_units: formData.total_units ? parseInt(formData.total_units) : null,
                        total_buildings: formData.total_buildings ? parseInt(formData.total_buildings) : null,
                        developer_id: projectForm.developer_id || null,
                        has_bathtub: formData.has_bathtub,
                        has_washlet: formData.has_washlet,
                        allows_pets: formData.allows_pets,
                        has_japanese_tv: formData.has_japanese_tv,
                        has_ev_charger: formData.has_ev_charger,
                        description_en: formData.description_en,
                        description_th: formData.description_th,
                        showroom_map_url: formData.showroom_map_url || null,
                    })
                    .select()
                    .single()

                if (insertError) throw insertError
                propertyId = newProperty.id
            }

            const newImageUrls = await uploadImages(propertyId)
            const finalImages = [...existingImages, ...newImageUrls]

            if (finalImages.length === 0) {
                throw new Error(ui.requiredAtLeastOneImage)
            }

            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    title: formData.title,
                    description: formData.description,
                    is_for_rent: false,
                    is_for_sale: true,
                    sale_price: parseFloat(formData.sale_price),
                    area_id: formData.area_id || null,
                    project_id: finalProjectId || null,
                    building_name: formData.building_name,
                    project_name: formData.project_name,
                    images: finalImages,
                    tags: formData.tags,
                    status: targetStatus,
                    is_approved: targetApproved,
                    updated_at: new Date().toISOString(),
                    property_type: formData.property_type,
                    sqm: formData.sqm ? parseFloat(formData.sqm) : null,
                    floor: formData.floor,
                    bedrooms: parseInt(formData.bedrooms),
                    bathrooms: parseInt(formData.bathrooms),
                    year_built: formData.year_built,
                    total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                    ownership_type: formData.ownership_type,
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
                    has_ev_charger: formData.has_ev_charger,
                    description_en: formData.description_en,
                    description_th: formData.description_th,
                    showroom_map_url: formData.showroom_map_url || null,
                })
                .eq('id', propertyId)
                .eq('user_id', user.id)

            if (updateError) throw updateError

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
            setTimeout(() => router.push('/dashboard'), 2000)
        } catch (err: any) {
            console.error('Submit error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateAI = async () => {
        setIsGeneratingAI(true)
        try {
            const textToTranslate = `
物件名: ${formData.title}
価格: ${formData.sale_price} THB
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

            // Move to JP tab after generation
            setActiveTab('jp')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsGeneratingAI(false)
        }
    }

    if (success) {
        return (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100">
                <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-emerald-600 w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-navy-secondary mb-4">{mode === 'create' ? ui.successCreate : ui.successUpdate}</h2>
                <p className="text-slate-500 mb-8">{ui.movingToDashboard}</p>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full animate-progress-fast"></div>
                </div>
            </div>
        )
    }

    if (!mounted) return null;

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
                    <h3 className="text-navy-secondary font-black mb-1">{ui.modeTitle}</h3>
                    <p className="text-xs text-slate-600 font-medium">{ui.modeDesc}</p>
                </div>
            </div>

            {/* Section 1: Project & Basic Info */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">1</span>
                    {ui.sectionProjectInfo}
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.areaLabel} <span className="text-red-500">*</span></label>
                        <select
                            value={formData.area_id}
                            onChange={e => {
                                const val = e.target.value
                                setFormData({ ...formData, area_id: val, project_id: '' })
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
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{ui.projectName} <span className="text-red-500">*</span></label>
                            {formData.area_id && (
                                <button type="button" onClick={() => { setShowNewProjectForm(true); setFormData({ ...formData, project_id: 'new' }) }} className="text-[10px] font-bold text-navy-secondary hover:text-navy-primary transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full">
                                    {ui.addAsNewProject}
                                </button>
                            )}
                        </div>
                        {!formData.area_id ? (
                            <div className="w-full px-5 py-4 bg-slate-50 opacity-50 border border-slate-100 rounded-2xl font-bold text-slate-400 text-sm">
                                {ui.selectAreaToChooseProject}
                            </div>
                        ) : showNewProjectForm ? (
                            <div className="w-full px-5 py-4 bg-navy-primary/5 border border-navy-primary/20 text-navy-primary rounded-2xl font-black text-sm text-center">
                                {ui.newProjectMode}
                            </div>
                        ) : (
                            <Select
                                isDisabled={!formData.area_id}
                                placeholder={ui.searchProject}
                                noOptionsMessage={() => ui.projectNotFound}
                                options={projects.filter(p => !formData.area_id || p.area_id === formData.area_id).map(p => ({
                                    value: p.id,
                                    label: params.locale === 'jp' && (p as any).name_jp
                                        ? `${p.name} (${(p as any).name_jp})`
                                        : p.name,
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
                                    // Extract developer name from joined developers table or text field
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
                                    control: (base) => ({ ...base, padding: '0.6rem', borderRadius: '1rem', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', boxShadow: 'none' }),
                                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#f1f5f9' : 'white', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }),
                                    menu: (base) => ({ ...base, borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 50 }),
                                    placeholder: (base) => ({ ...base, fontWeight: 'bold', color: '#94a3b8' })
                                }}
                            />
                        )}

                        {!showNewProjectForm && formData.project_id && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center">
                                    <Shield className="w-3 h-3 mr-2" />
                                    {ui.projectFacilities}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {formData.project_facilities?.length > 0 ? (
                                        formData.project_facilities.map((f: string) => (
                                            <span key={f} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-navy-secondary">
                                                {getSharedFacilityLabel(f)}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 italic ml-1">{ui.notRegistered}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {isAdmin && linkedProjectMap && !showNewProjectForm && formData.project_id && (
                            <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50/50 p-6">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-900">
                                    管理者: 紐づくプロジェクトの位置情報
                                </h4>
                                <GoogleMapsShareLinkField
                                    shareUrl={linkedProjectMap.google_maps_share_url}
                                    onShareUrlChange={(v) =>
                                        setLinkedProjectMap((prev) =>
                                            prev ? { ...prev, google_maps_share_url: v } : null
                                        )
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
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.developerNameLabel}</label>
                        <input
                            type="text"
                            value={formData.developer}
                            onChange={e => setFormData({ ...formData, developer: e.target.value })}
                            placeholder="Developer name..."
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all font-bold text-navy-secondary"
                        />
                        <p className="mt-1.5 text-[10px] text-slate-400 font-medium ml-1 italic">{ui.developerNameNote}</p>
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
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.developerLabel} <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={projectForm.developer_id}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const devName = developers.find(d => d.id === val)?.name || '';
                                            setProjectForm({ ...projectForm, developer_id: val, developer: devName });
                                            setFormData({ ...formData, developer: devName });
                                        }}
                                        className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl font-bold text-navy-secondary appearance-none"
                                    >
                                        <option value="">{ui.selectDeveloper}</option>
                                        {developers.map(dev => (
                                            <option key={dev.id} value={dev.id}>{dev.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">位置情報 (MAP)</label>
                                    <div className="h-auto space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                                        <GoogleMapsShareLinkField
                                            shareUrl={projectForm.google_maps_share_url}
                                            onShareUrlChange={(v) =>
                                                setProjectForm((prev) => ({ ...prev, google_maps_share_url: v }))
                                            }
                                            onResolved={(data) =>
                                                setProjectForm((prev) => ({
                                                    ...prev,
                                                    google_place_id:
                                                        data.google_place_id != null
                                                            ? data.google_place_id
                                                            : prev.google_place_id,
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
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <label className="block text-xs font-black text-navy-primary uppercase tracking-widest mb-4 ml-1 flex items-center">
                                    <Shield className="w-4 h-4 mr-2" />
                                    共有施設 (Shared Facilities)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {SHARED_FACILITIES.map(facility => {
                                        const isSelected = formData.project_facilities.includes(facility)
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
                                                {getSharedFacilityLabel(facility)}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.priceLabel} <span className="text-red-500">*</span></label>
                            <input type="number" placeholder="2500000" value={formData.sale_price} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.ownershipLabel}</label>
                            <select value={formData.ownership_type} onChange={e => setFormData({ ...formData, ownership_type: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="Foreign Quota">外国人クオータ (Foreign Quota)</option>
                                <option value="Thai Quota">タイ人クオータ (Thai Quota)</option>
                                <option value="Thai Company">タイ法人名義 (Company Name)</option>
                            </select>
                        </div>
                    </div>

                    {/* 平米単価 自動計算表示 */}
                    {formData.sale_price && formData.sqm && parseFloat(formData.sqm) > 0 && (
                        <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                            <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{ui.pricePerSqm}</span>
                                <span className="ml-3 text-base font-black text-blue-700 tabular-nums">
                                    {Math.round(parseFloat(formData.sale_price) / parseFloat(formData.sqm)).toLocaleString()} THB/㎡
                                </span>
                            </div>
                            <span className="ml-auto text-[10px] text-blue-300 font-bold">{ui.autoCalculated}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{getPropertyTypeFieldLabel(locale)}</label>
                            <select value={formData.property_type} onChange={e => setFormData({ ...formData, property_type: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="Condo">{getPropertyTypeOptionLabel('Condo', locale)}</option>
                                <option value="House">{getPropertyTypeOptionLabel('House', locale)}</option>
                                <option value="Townhouse">{getPropertyTypeOptionLabel('Townhouse', locale)}</option>
                                <option value="Commercial">{getPropertyTypeOptionLabel('Commercial', locale)}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.areaSqm}</label>
                            <input type="number" value={formData.sqm} onChange={e => setFormData({ ...formData, sqm: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.bedroomPlan}</label>
                            <select value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold">
                                <option value="0">Studio</option><option value="1">1 Bed</option><option value="2">2 Beds</option><option value="3">3 Beds+</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Presale specific info */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center mr-3 text-amber-500 text-sm font-black">2</span>
                    {ui.sectionPresaleDetails}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1" /> {ui.completionSchedule}</label>
                        <input type="text" placeholder={ui.completionPlaceholder} value={formData.completion_date} onChange={e => setFormData({ ...formData, completion_date: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.developerLabel}</label>
                        <input type="text" placeholder="Sansiri" value={formData.developer} onChange={e => setFormData({ ...formData, developer: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.landArea}</label>
                        <input type="text" placeholder="2 Rai 3 Ngan" value={formData.land_area} onChange={e => setFormData({ ...formData, land_area: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.constructionStatus}</label>
                        <select value={formData.construction_status} onChange={e => setFormData({ ...formData, construction_status: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl appearance-none font-bold">
                            <option value="planning">{ui.planning}</option>
                            <option value="under_construction">{ui.underConstruction}</option>
                            <option value="completed">{ui.completed}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.totalUnits}</label>
                        <input type="number" placeholder="500" value={formData.total_units} onChange={e => setFormData({ ...formData, total_units: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{ui.totalBuildings}</label>
                        <input type="number" placeholder="2" value={formData.total_buildings} onChange={e => setFormData({ ...formData, total_buildings: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-bold" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center"><Wallet className="w-3 h-3 mr-1" /> {ui.paymentPlan}</label>
                    <textarea rows={3} placeholder={ui.paymentPlanPlaceholder} value={formData.payment_plan} onChange={e => setFormData({ ...formData, payment_plan: e.target.value })} className="w-full px-5 py-4 bg-amber-50/50 border border-amber-100 rounded-2xl resize-none font-medium text-sm" />
                </div>
                <div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-4">
                        <div className="space-y-1">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{ui.appealPoints} <span className="text-red-500">*</span></label>
                            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('jp')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'jp' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                                >
                                    {ui.jpTab}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('en')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'en' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                                >
                                    English (EN)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('th')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'th' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-500 hover:text-navy-primary'}`}
                                >
                                    Thai (TH)
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI}
                            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-200 transition-all disabled:opacity-50"
                        >
                            {isGeneratingAI ? (
                                <>
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                    <span>{ui.aiWriting}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>{ui.aiGenerate}</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {isGeneratingAI ? (
                                <motion.div
                                    key="skeleton"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-3 p-6 bg-slate-50 border border-slate-100 rounded-3xl"
                                >
                                    <div className="h-4 bg-slate-200 rounded-full w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded-full w-full animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded-full w-5/6 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 rounded-full w-2/3 animate-pulse"></div>
                                    <div className="mt-4 flex items-center text-xs font-bold text-amber-500 animate-pulse">
                                        <Sparkles className="w-3 h-3 mr-2" />
                                        {ui.aiGeneratingDesc}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <textarea
                                        rows={8}
                                        value={activeTab === 'jp' ? formData.description : activeTab === 'en' ? formData.description_en : formData.description_th}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (activeTab === 'jp') setFormData({ ...formData, description: val })
                                            else if (activeTab === 'en') setFormData({ ...formData, description_en: val })
                                            else if (activeTab === 'th') setFormData({ ...formData, description_th: val })
                                        }}
                                        placeholder={activeTab === 'jp' ? "プロジェクトの魅力を入力してください..." : activeTab === 'en' ? "Project description in English..." : "คำอธิบายโครงการภาษาไทย..."}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl resize-none font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Section 3: Advanced Investor Details (Accordion) */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="w-full flex items-center justify-between px-10 py-6 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center text-navy-primary text-sm font-black">3</span>
                        <div className="text-left">
                            <p className="text-xl font-black text-navy-secondary flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-slate-400" />
                                {ui.sectionAdvanced}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{ui.sectionAdvancedSub}</p>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="px-10 pb-10 space-y-8 border-t border-slate-100">

                        {/* アメニティ（共有施設）チェックボックス */}
                        <div className="pt-8">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                {ui.amenities}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {SHARED_FACILITIES.map(facility => {
                                    const isSelected = formData.project_facilities.includes(facility)
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
                                            className={`px-3 py-2.5 rounded-xl text-[11px] font-black transition-all border-2 text-center ${isSelected ? 'bg-navy-primary border-navy-primary text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-navy-primary/30'}`}
                                        >
                                            {getSharedFacilityLabel(facility)}
                                        </button>
                                    )
                                })}
                            </div>
                            {formData.project_facilities.length > 0 && (
                                <p className="mt-3 text-[10px] text-navy-primary font-bold ml-1">
                                    ✓ {formData.project_facilities.length} {ui.selectedCount}
                                </p>
                            )}
                        </div>

                        {/* ショールームGoogle Map URL */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                <Link2 className="w-3.5 h-3.5" />
                                {ui.showroomMapUrl}
                            </label>
                            <input
                                type="url"
                                placeholder="https://maps.google.com/..."
                                value={formData.showroom_map_url}
                                onChange={e => setFormData({ ...formData, showroom_map_url: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                            />
                            <p className="mt-1.5 text-[10px] text-slate-400 font-medium ml-1">
                                {ui.showroomMapHint}
                            </p>
                        </div>

                        {/* Quota 詳細 */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                {ui.quotaDetails}
                            </label>
                            <select
                                value={formData.ownership_type}
                                onChange={e => setFormData({ ...formData, ownership_type: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none font-bold focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                            >
                                <option value="Foreign Quota">🌏 Foreign Quota（外国人クオータ枠）</option>
                                <option value="Thai Quota">🇹🇭 Thai Quota（タイ人枠）</option>
                                <option value="Thai Company">🏢 Company Name（タイ法人名義）</option>
                            </select>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-bold">
                                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
                                    <span className="font-black">Foreign Quota</span><br />
                                    {ui.quotaForeignDesc}
                                </div>
                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                                    <span className="font-black">Thai Quota</span><br />
                                    {ui.quotaThaiDesc}
                                </div>
                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                                    <span className="font-black">Company Name</span><br />
                                    {ui.quotaCompanyDesc}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 4: Image Gallery */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100 space-y-8">
                <h3 className="text-xl font-black text-navy-secondary flex items-center">
                    <span className="w-8 h-8 bg-navy-primary/10 rounded-lg flex items-center justify-center mr-3 text-navy-primary text-sm font-black">4</span>
                    {ui.sectionImages}
                </h3>
                <ImageUploader initialImages={existingImages} onImagesChange={(files) => setSelectedFiles(files)} locale={locale} />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end p-10 bg-navy-secondary rounded-3xl text-white shadow-2xl flex-col md:flex-row gap-6">
                <button
                    disabled={loading}
                    className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 border-2 border-amber-500 text-white px-12 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><span>{ui.publishPresale}</span><Plus /></>}
                </button>
            </div>

            <style jsx>{` @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } } .animate-progress-fast { animation: progress-fast 2s linear infinite; } `}</style>
        </form>
    )
}
