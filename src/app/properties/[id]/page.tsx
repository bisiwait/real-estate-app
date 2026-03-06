import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

export const runtime = 'edge'
export const revalidate = 60

import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'
import PropertyGallery from '@/components/property/PropertyGallery'
import RelatedProperties from '@/components/property/RelatedProperties'
import InquiryForm from '@/components/property/InquiryForm'
import PropertyDescription from '@/components/property/PropertyDescription'
import AgentProfileCard from '@/components/agent/AgentProfileCard'
import AgentOtherProperties from '@/components/agent/AgentOtherProperties'
import {
    MapPin,
    Maximize2,
    Layers,
    Tag as TagIcon,
    Calendar,
    ChevronLeft,
    Bath,
    Coffee,
    Check,
    Tv,
    Zap,
    Home,
    Building2,
    Wifi,
    Refrigerator,
    PawPrint,
    Building,
    Sparkles,
    Gem,
    Wind,
    Waves,
    Shirt,
    ArrowUpDown,
    Droplets,
    BadgePercent,
    Shield,
    Users,
    Car,
    Dumbbell,
    Baby
} from 'lucide-react'
import Link from 'next/link'

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch property and auth user in parallel for speed
    const [propertyRes, authRes] = await Promise.all([
        supabase
            .from('properties')
            .select('*, area:areas(name, slug, region:regions(name)), project:projects(*)')
            .eq('id', id)
            .single(),
        supabase.auth.getUser()
    ])

    const { data: property, error } = propertyRes
    const { data: { user } } = authRes

    if (error) {
        console.error('Error fetching property:', error)
    }

    if (!property) {
        notFound()
    }

    // Fetch admin status if logged in
    const isAdmin = user ? (await supabase.from('profiles').select('is_admin').eq('id', user.id).single()).data?.is_admin : false

    // Allow access check
    const hasAccess = property.is_approved || (user && property.user_id === user.id) || isAdmin

    if (!hasAccess) {
        notFound()
    }

    // Define Japanese highlight tags with icons
    const highlightIcons: Record<string, any> = {
        'バスタブあり': Bath,
        'ウォシュレット完備': Droplets,
        '洗濯機': Shirt,
        '洗濯機室内': Shirt,
        'テレビ': Tv,
        'WiFi': Wifi,
        '冷蔵庫': Refrigerator,
        'ペット可': PawPrint,
        '高層階': ArrowUpDown,
        '築浅': Sparkles,
        '格安': BadgePercent,
        '高級物件': Gem,
        'バルコニー広い': Wind,
        'オーシャンビュー': Waves,
        'シティービュー': Building,
        '日本語対応スタッフ': Check,
        '日本語テレビ対応': Tv,
        'EV充電器あり': Zap,
        '高層階（オーシャンビュー期待）': Waves,
        'スイミングプール': Waves,
        'サウナ': Wind,
        'スチームルーム': Wind,
        'ジャグジー': Bath,
        'フィットネス': Dumbbell,
        'EV充電器': Car,
        'キッズプレイグラウンド': Baby,
        'オートロック': Shield,
        'コンシェルジュ': Users,
        '駐車場': Car
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <BreadcrumbUpdater label={`詳細 / ${property.title}`} />

            <div className="container mx-auto px-4 pt-8 md:pt-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Main Info (Left Column) */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Gallery */}
                        <PropertyGallery images={property.images} />

                        {/* Title and Key Stats - Ensure clear separation */}
                        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 relative z-10 mt-6 overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 pb-8 border-b border-slate-50">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-4">
                                        <h1 className="text-xl md:text-2xl font-black text-navy-secondary leading-[1.2]">
                                            {property.status === 'contracted' && (
                                                <span className="inline-block bg-purple-600 text-white text-sm px-3 py-1 rounded-full align-middle mr-3 mb-1 shadow-sm tracking-widest uppercase">成約済</span>
                                            )}
                                            {property.status === 'under_negotiation' && (
                                                <span className="inline-block bg-blue-600 text-white text-sm px-3 py-1 rounded-full align-middle mr-3 mb-1 shadow-sm tracking-widest uppercase">商談中</span>
                                            )}
                                            {property.is_presale && (
                                                <span className="inline-block bg-amber-500 text-white text-sm px-3 py-1 rounded-full align-middle mr-3 mb-1 shadow-sm tracking-widest uppercase">プレセール</span>
                                            )}
                                            {property.title}
                                        </h1>
                                        <div className="flex items-center text-navy-primary font-black text-xs uppercase tracking-tighter shrink-0">
                                            <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                            {property.area?.region?.name} • {property.area?.name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 overflow-x-auto pb-1 hide-scrollbar">
                                        <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
                                            <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 text-slate-400" />
                                            <span className="mr-1">{property.is_presale ? '竣工予定:' : '築年数:'}</span>
                                            <span className="text-navy-secondary">{property.is_presale ? (property.completion_date || '--') : (property.year_built || '--')}</span>
                                        </div>
                                        <div className="w-[1px] h-3 bg-slate-200"></div>
                                        <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
                                            <Layers className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 text-slate-400" />
                                            <span className="mr-1">総階数:</span>
                                            <span className="text-navy-secondary">{property.total_floors ? `${property.total_floors}階` : '--'}</span>
                                        </div>
                                        <div className="w-[1px] h-3 bg-slate-200"></div>
                                        <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
                                            <TagIcon className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5 text-slate-400" />
                                            <span className="mr-1">掲載日:</span>
                                            <span className="text-navy-secondary">{new Date(property.created_at).toLocaleDateString('ja-JP')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left md:text-right space-y-2 md:space-y-4 shrink-0">
                                    {property.is_for_rent && (
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">賃貸 / 月</div>
                                            <div className="text-3xl font-black text-navy-secondary leading-none">
                                                {property.rent_price?.toLocaleString()} <span className="text-sm font-normal">THB</span>
                                            </div>
                                        </div>
                                    )}
                                    {property.is_for_sale && (
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">販売価格</div>
                                            <div className="text-3xl font-black text-navy-secondary leading-none">
                                                {property.sale_price?.toLocaleString()} <span className="text-sm font-normal">THB</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
                                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">物件タイプ</p>
                                    <p className="text-xs sm:text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-navy-primary" />
                                        {property.property_type === 'Condo' ? 'コンドミニアム' :
                                            property.property_type === 'Apartment' ? 'アパート' :
                                                property.property_type === 'House' ? '一軒家 / ヴィラ' :
                                                    property.property_type === 'Townhouse' ? 'タウンハウス' :
                                                        property.property_type === 'Land' ? '土地' :
                                                            property.property_type === 'Commercial' ? '商業用' : 'コンドミニアム'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">広さ</p>
                                    <p className="text-xs sm:text-sm font-bold text-navy-secondary flex items-center">
                                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-navy-primary" />
                                        {property.sqm || '--'} ㎡
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">所在階 / 間取り</p>
                                    <p className="text-xs sm:text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-navy-primary" />
                                        {property.floor ? `${property.floor}F / ` : ''}
                                        {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}BR`}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">浴室数</p>
                                    <p className="text-xs sm:text-sm font-bold text-navy-secondary flex items-center">
                                        <Bath className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 text-navy-primary" />
                                        {property.bathrooms || '1'}
                                    </p>
                                </div>
                                {property.is_for_sale && property.ownership_type && (
                                    <div className="bg-navy-primary/5 p-3 sm:p-4 rounded-2xl border border-navy-primary/10">
                                        <p className="text-[9px] sm:text-[10px] font-black text-navy-primary uppercase tracking-widest mb-1 sm:mb-1.5">所有権 (Quota)</p>
                                        <p className="text-xs sm:text-sm font-black text-navy-primary flex items-center">
                                            <TagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                                            {property.ownership_type}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Description */}
                        <PropertyDescription description={property.description} />

                        {/* Presale Specifics */}
                        {property.is_presale && (
                            <div className="bg-amber-50 rounded-3xl p-8 shadow-xl border border-amber-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[100px] -z-0"></div>
                                <h3 className="text-lg font-black text-amber-600 mb-6 flex items-center relative z-10">
                                    <Home className="w-5 h-5 mr-3" />
                                    プレセール（新築投資）プロジェクト情報
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 relative z-10">
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><Calendar className="w-3 h-3 mr-1" /> 完成年</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.completion_date || property.year_built || '--'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><Building2 className="w-3 h-3 mr-1" /> デベロッパー</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.developer || '--'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><MapPin className="w-3 h-3 mr-1" /> 敷地面積</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.land_area || '--'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><Home className="w-3 h-3 mr-1" /> 総戸数 / 棟数</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.total_units ? `${property.total_units}戸` : '--'} / {property.total_buildings ? `${property.total_buildings}棟` : '--'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><Layers className="w-3 h-3 mr-1" /> 想定間取り</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Bed`}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><TagIcon className="w-3 h-3 mr-1" /> 販売価格</p>
                                        <p className="font-bold text-navy-secondary text-lg">{property.sale_price ? `${property.sale_price.toLocaleString()} THB` : '--'}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm mt-0 md:col-span-2 lg:col-span-3">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center"><Layers className="w-3 h-3 mr-1" /> 現在のステータス</p>
                                        <p className="font-bold text-navy-secondary text-lg">
                                            {property.construction_status === 'planning' ? '計画中・プレセール' :
                                                property.construction_status === 'under_construction' ? '建設中' :
                                                    property.construction_status === 'completed' ? '完成済' : '確認中'}
                                        </p>
                                    </div>
                                </div>
                                {property.payment_plan && (
                                    <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm relative z-10">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center"><Check className="w-3 h-3 mr-1" /> 支払いスケジュール・利回り等の補足</p>
                                        <div className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                                            {property.payment_plan}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Secret Memo (Admin Comments) */}
                        {property.admin_memo && (
                            <div className="bg-navy-primary text-white rounded-3xl p-8 shadow-xl border border-navy-primary overflow-hidden relative group">
                                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                                    <TagIcon className="w-32 h-32" />
                                </div>
                                <h3 className="text-lg font-black mb-6 flex items-center relative z-10">
                                    <Check className="w-5 h-5 mr-3" />
                                    エージェント推薦コメント
                                </h3>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-sm font-medium leading-relaxed relative z-10 border border-white/20">
                                    {property.admin_memo}
                                </div>
                            </div>
                        )}

                        {/* Detailed Spec Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Water Features */}
                            {(property.has_bathtub || property.has_washlet || property.water_heater_type) && (
                                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                        <Bath className="w-4 h-4 mr-2 text-navy-primary" />
                                        水回り・設備
                                    </h3>
                                    <div className="space-y-4">
                                        {property.has_bathtub && (
                                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                                <span className="text-sm font-bold text-slate-600">バスタブ</span>
                                                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                                                    あり
                                                </span>
                                            </div>
                                        )}
                                        {property.has_washlet && (
                                            <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                                <span className="text-sm font-bold text-slate-600">ウォシュレット</span>
                                                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-600">
                                                    完備
                                                </span>
                                            </div>
                                        )}
                                        {property.water_heater_type && (
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">給湯器</span>
                                                <span className="text-sm font-bold text-navy-secondary">{property.water_heater_type}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Utility Costs */}
                            {(property.electricity_bill_type || property.water_bill_desc || property.internet_desc) && (
                                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                        <Layers className="w-4 h-4 mr-2 text-navy-primary" />
                                        生活コスト
                                    </h3>
                                    <div className="space-y-4">
                                        {property.electricity_bill_type && (
                                            <div className="flex flex-col space-y-1 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">電気代支払い</span>
                                                <span className="text-sm font-bold text-navy-secondary">
                                                    {property.electricity_bill_type === 'Direct' ? 'Direct (電力会社直接払い)' : 'Condo Rate (コンドミニアム設定価格)'}
                                                </span>
                                            </div>
                                        )}
                                        {property.water_bill_desc && (
                                            <div className="flex flex-col space-y-1 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">水道代</span>
                                                <span className="text-sm font-bold text-navy-secondary">{property.water_bill_desc}</span>
                                            </div>
                                        )}
                                        {property.internet_desc && (
                                            <div className="flex flex-col space-y-1 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">インターネット</span>
                                                <span className="text-sm font-bold text-navy-secondary">{property.internet_desc}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                        </div>


                        {/* Tags / Features */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">

                            <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                <Check className="w-5 h-5 mr-3 text-navy-primary" />
                                こだわり設備
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                                {property.tags.map((tag: string) => {
                                    const Icon = highlightIcons[tag] || Check
                                    return (
                                        <div key={tag} className="flex items-center p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] sm:text-sm font-bold text-navy-secondary">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-navy-primary/10 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                                                <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-navy-primary" />
                                            </div>
                                            {tag}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Property Basic Information */}
                        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 relative z-10">
                            <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                <Building2 className="w-5 h-5 mr-3 text-navy-primary" />
                                物件基本情報
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">物件名 / 建物名</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.building_name || property.project_name || '--'}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">築年数 / 完成年</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.year_built || property.completion_date || '--'}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">総階数</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.total_floors ? `${property.total_floors}階` : '--'}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">総ユニット数</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.total_units ? `${property.total_units}戸` : '--'}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">デベロッパー</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.developer || '--'}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                                    <span className="text-sm font-bold text-slate-500">所在エリア</span>
                                    <span className="text-sm font-black text-navy-secondary">{property.area?.name || '--'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shared Facilities */}
                        {((property.project_facilities && property.project_facilities.length > 0) || (property.project?.facilities && property.project.facilities.length > 0)) && (
                            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 relative z-10">
                                <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                    <Shield className="w-5 h-5 mr-3 text-navy-primary" />
                                    共有施設
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {(property.project_facilities || property.project?.facilities || []).map((facility: string) => {
                                        const Icon = highlightIcons[facility] || Check
                                        return (
                                            <div key={facility} className="flex items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-navy-secondary">
                                                <div className="w-8 h-8 rounded-full bg-navy-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                                                    <Icon className="w-4 h-4 text-navy-primary" />
                                                </div>
                                                {facility}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Location Link Button */}
                        <div className="pt-2 pb-6 flex justify-center w-full">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${property.project?.latitude || 12.9236},${property.project?.longitude || 100.8824}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center space-x-3 bg-navy-primary hover:bg-navy-secondary text-white w-full md:w-auto px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 group"
                            >
                                <MapPin className="w-5 h-5 group-hover:animate-bounce" />
                                <span>場所を確認する</span>
                            </a>
                        </div>
                    </div>

                    {/* Sidebar (Inquiry Form & Contact) */}
                    <div className="lg:col-span-1 relative">
                        <div className="flex flex-col gap-8 lg:pb-8">
                            <AgentProfileCard agentId={property.user_id} />
                            <InquiryForm propertyId={property.id} propertyName={property.title} />
                        </div>
                    </div>

                </div >

                {/* Agent Other Properties */}
                <Suspense fallback={<div className="mt-20 h-40 bg-slate-100 animate-pulse rounded-3xl" />}>
                    <AgentOtherProperties
                        agentId={property.user_id}
                        currentPropertyId={property.id}
                    />
                </Suspense>

                {/* Related Properties */}
                <Suspense fallback={<div className="mt-20 h-40 bg-slate-100 animate-pulse rounded-3xl" />}>
                    <RelatedProperties
                        currentPropertyId={property.id}
                        buildingName={property.building_name}
                        projectName={property.project_name}
                    />
                </Suspense>
            </div >
        </div >
    )
}
