import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'
import PropertyGallery from '@/components/property/PropertyGallery'
import RelatedProperties from '@/components/property/RelatedProperties'
import InquiryForm from '@/components/property/InquiryForm'
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
    Building2
} from 'lucide-react'
import Link from 'next/link'

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    let { data: property, error } = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name)), project:projects(*)')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching property:', error)
    }
    console.log('Fetched property:', property ? { id: property.id, status: property.status, is_approved: property.is_approved } : 'null')

    // Fallback logic removed to ensure only DB properties are shown
    const isMock = false

    if (!property) {
        notFound()
    }

    // Access Check
    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user ? (await supabase.from('profiles').select('is_admin').eq('id', user.id).single()).data?.is_admin : false

    // Allow access if:
    // 1. It's a mock property (for demo)
    // 2. It's approved
    // 3. User is the owner
    // 4. User is an admin
    const hasAccess = isMock || property.is_approved || (user && property.user_id === user.id) || isAdmin

    if (!hasAccess) {
        notFound()
    }

    // Define Japanese highlight tags with icons
    const highlightIcons: Record<string, any> = {
        'バスタブあり': Bath,
        'ウォシュレット完備': Check,
        '洗濯機室内': Coffee,
        '日本語対応スタッフ': Check,
        '日本語テレビ対応': Tv,
        'ペット可': Check,
        'EV充電器あり': Zap,
        '高層階（オーシャンビュー期待）': Maximize2
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
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-8 border-b border-slate-50">
                                <div>
                                    <div className="flex items-center text-navy-primary font-black text-sm mb-3 uppercase tracking-tighter">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        {property.area?.region?.name} • {property.area?.name}
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-black text-navy-secondary leading-[1.2]">
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
                                </div>
                                <div className="text-right space-y-4">
                                    {property.is_for_rent && (
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">賃貸 / 月</div>
                                            <div className="text-3xl font-black text-navy-primary leading-none">
                                                {property.rent_price?.toLocaleString()} <span className="text-sm font-normal">THB</span>
                                            </div>
                                        </div>
                                    )}
                                    {property.is_for_sale && (
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest leading-none">販売価格</div>
                                            <div className="text-3xl font-black text-navy-primary leading-none">
                                                {property.sale_price?.toLocaleString()} <span className="text-sm font-normal">THB</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">物件タイプ</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.property_type === 'Condo' ? 'コンドミニアム' :
                                            property.property_type === 'Apartment' ? 'アパート' :
                                                property.property_type === 'House' ? '一軒家 / ヴィラ' :
                                                    property.property_type === 'Townhouse' ? 'タウンハウス' :
                                                        property.property_type === 'Land' ? '土地' :
                                                            property.property_type === 'Commercial' ? '商業用' : 'コンドミニアム'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">広さ</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Maximize2 className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.sqm || '--'} ㎡
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">所在階 / 間取り</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.floor ? `${property.floor}F / ` : ''}
                                        {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}BR`}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">浴室数</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Bath className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.bathrooms || '1'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{property.is_presale ? '竣工予定' : '築年数'}</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.is_presale ? (property.completion_date || '--') : (property.year_built || '--')}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">総階数</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.total_floors ? `${property.total_floors}階` : '--'}
                                    </p>
                                </div>
                                {property.is_for_sale && property.ownership_type && (
                                    <div className="bg-navy-primary/5 p-4 rounded-2xl border border-navy-primary/10">
                                        <p className="text-[10px] font-black text-navy-primary uppercase tracking-widest mb-1.5">所有権 (Quota)</p>
                                        <p className="text-sm font-black text-navy-primary flex items-center">
                                            <TagIcon className="w-4 h-4 mr-2" />
                                            {property.ownership_type}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">掲載日</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-navy-primary" />
                                        {new Date(property.created_at).toLocaleDateString('ja-JP')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                            <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                <Layers className="w-5 h-5 mr-3 text-navy-primary" />
                                物件詳細
                            </h3>
                            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                {property.description}
                            </div>
                        </div>

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

                            {/* Environment */}
                            {(property.distance_to_supermarket || property.noise_level || property.transportation_desc) && (
                                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                        <MapPin className="w-4 h-4 mr-2 text-navy-primary" />
                                        周辺環境
                                    </h3>
                                    <div className="space-y-4">
                                        {property.distance_to_supermarket && (
                                            <div className="flex flex-col space-y-1 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">日本食スーパー</span>
                                                <span className="text-sm font-bold text-navy-secondary">{property.distance_to_supermarket}</span>
                                            </div>
                                        )}
                                        {property.noise_level && (
                                            <div className="flex flex-col space-y-3 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-center">
                                                    騒音レベル
                                                    <span className="text-navy-primary opacity-50 uppercase tracking-tighter">Scale 1-5</span>
                                                </span>
                                                <div className="flex space-x-1.5 pt-1">
                                                    {[1, 2, 3, 4, 5].map(level => (
                                                        <div
                                                            key={level}
                                                            className={`h-2 flex-1 rounded-full transition-all ${level <= property.noise_level ? 'bg-navy-primary shadow-sm shadow-navy-primary/20' : 'bg-slate-100'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 text-center">
                                                    {property.noise_level <= 2 ? '比較的静かな環境です' : property.noise_level === 3 ? '一般的な生活音レベル' : '商業エリアのため賑やかです'}
                                                </span>
                                            </div>
                                        )}
                                        {property.transportation_desc && (
                                            <div className="flex flex-col space-y-1 py-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">交通アクセス</span>
                                                <span className="text-sm font-bold text-navy-secondary">{property.transportation_desc}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Project / Building Info Section */}
                        {property.project && (
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden group">
                                <div className="grid grid-cols-1 md:grid-cols-2">
                                    <div className="relative h-64 md:h-full min-h-[300px]">
                                        <img
                                            src={property.project.image_url || property.images[0]}
                                            alt={property.project.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-navy-secondary/80 to-transparent" />
                                        <div className="absolute bottom-8 left-8 right-8 text-white">
                                            <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Building Overview</div>
                                            <h3 className="text-2xl font-black">{property.project.name}</h3>
                                        </div>
                                    </div>
                                    <div className="p-8 md:p-10 space-y-8">
                                        <h3 className="text-lg font-black text-navy-secondary flex items-center">
                                            <Home className="w-5 h-5 mr-3 text-navy-primary" />
                                            建物・プロジェクト情報
                                        </h3>

                                        {property.project.description && (
                                            <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                                                「{property.project.description}」
                                            </p>
                                        )}

                                        <div className="grid grid-cols-1 gap-4">
                                            {property.project.address && (
                                                <div className="flex items-start">
                                                    <MapPin className="w-4 h-4 mr-3 text-navy-primary flex-shrink-0 mt-0.5" />
                                                    <span className="text-xs font-bold text-slate-600 leading-relaxed">{property.project.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        {property.project.facilities && property.project.facilities.length > 0 && (
                                            <div className="pt-4 border-t border-slate-50">
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Common Facilities</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {property.project.facilities.map((fac: string) => (
                                                        <span key={fac} className="bg-slate-50 text-navy-secondary text-[10px] font-black px-3 py-1.5 rounded-full border border-slate-100">
                                                            {fac}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Tags / Features */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">

                            <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                <TagIcon className="w-5 h-5 mr-3 text-navy-primary" />
                                日本人向けこだわり設備
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {property.tags.map((tag: string) => {
                                    const Icon = highlightIcons[tag] || Check
                                    return (
                                        <div key={tag} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-navy-secondary">
                                            <div className="w-8 h-8 rounded-full bg-navy-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                                                <Icon className="w-4 h-4 text-navy-primary" />
                                            </div>
                                            {tag}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

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
                    <div className="lg:col-span-1 space-y-8">
                        <div className="sticky top-28 space-y-8">
                            <InquiryForm propertyId={property.id} propertyName={property.title} />

                        </div>
                    </div>

                </div>

                {/* Related Properties */}
                <RelatedProperties
                    currentPropertyId={property.id}
                    buildingName={property.building_name}
                    projectName={property.project_name}
                />
            </div>
        </div>
    )
}
