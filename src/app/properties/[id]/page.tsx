import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const PropertyGallery = dynamic(() => import('@/components/property/PropertyGallery'), {
    loading: () => <div className="w-full aspect-[16/9] md:aspect-[3/2] lg:h-[550px] bg-slate-100 animate-pulse rounded-3xl" />
})

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
    Zap
} from 'lucide-react'
import Link from 'next/link'

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    let { data: property, error } = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name))')
        .eq('id', id)
        .single()

    // Fallback to mock data for demo purposes
    let isMock = false
    if (!property) {
        const { MOCK_PROPERTIES } = require('@/lib/mock-data')
        const mockProperty = MOCK_PROPERTIES.find((p: any) => p.id === id)

        if (mockProperty) {
            isMock = true
            property = {
                ...mockProperty,
                area: { name: mockProperty.area_name, region: { name: 'Pattaya' } }
            }
        }
    }

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
            {/* Breadcrumbs - Add mt to clear sticky header space if needed, though sticky should handle it */}
            <div className="bg-white border-b border-slate-100 relative z-20">
                <div className="container mx-auto px-4 py-4 flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <Link href="/properties" className="hover:text-navy-primary flex items-center transition-colors">
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        物件検索に戻る
                    </Link>
                    <span className="mx-3 text-slate-200">/</span>
                    <span className="text-navy-secondary truncate max-w-[200px]">{property.title}</span>
                </div>
            </div>

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
                                    <h1 className="text-3xl md:text-4xl font-black text-navy-secondary leading-[1.2]">{property.title}</h1>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-400 mb-1">賃料 / 月</div>
                                    <div className="text-4xl font-black text-navy-primary">
                                        {property.price?.toLocaleString()} <span className="text-lg font-normal">THB</span>
                                    </div>
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
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">築年数</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.year_built || '--'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">総階数</p>
                                    <p className="text-sm font-bold text-navy-secondary flex items-center">
                                        <Layers className="w-4 h-4 mr-2 text-navy-primary" />
                                        {property.total_floors ? `${property.total_floors}階` : '--'}
                                    </p>
                                </div>
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

                        {/* Map Integration */}
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 overflow-hidden">
                            <h3 className="text-lg font-black text-navy-secondary mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-3 text-navy-primary" />
                                周辺地図
                            </h3>
                            <div className="relative rounded-2xl overflow-hidden h-80 bg-slate-100 border border-slate-100 shadow-inner group">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${property.area?.name},Pattaya,Thailand`}
                                    allowFullScreen
                                    className="grayscale hover:grayscale-0 transition-all duration-700"
                                ></iframe>
                                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/60 backdrop-blur-md z-10">
                                        <div className="text-center px-6">
                                            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                                            <p className="text-xs font-bold text-slate-500">Google Maps API キーが設定されていません</p>
                                            <p className="text-[10px] text-slate-400 mt-1">詳細な位置は管理画面で API キーを設定すると表示されます</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-4 text-center">
                                ※正確な位置情報は、お問い合わせ後に担当者より共有させていただきます。
                            </p>
                        </div>
                    </div>

                    {/* Sidebar (Inquiry Form & Contact) */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="sticky top-28 space-y-8">
                            <InquiryForm propertyId={property.id} propertyName={property.title} />

                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
