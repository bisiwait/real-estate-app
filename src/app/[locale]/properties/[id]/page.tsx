import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'
import PropertyGallery from '@/components/property/PropertyGallery'
import RelatedProperties from '@/components/property/RelatedProperties'
import InquiryForm from '@/components/property/InquiryForm'
import PropertyDescription from '@/components/property/PropertyDescription'
import AgentProfileCard from '@/components/agent/AgentProfileCard'
import AgentOtherProperties from '@/components/agent/AgentOtherProperties'
import StickyContactBar from '@/components/property/StickyContactBar'
import LineContactButton from '@/components/property/LineContactButton'
import {
    MapPin, Building2, Bath, Calendar, Layers, Maximize2, Tag, Check, Gem, Sparkles,
    Waves, Dumbbell, Car, Shield, Users, Baby, Tv, ShoppingBag, Wind, Coffee, Utensils,
    Wifi, Refrigerator, ArrowUp, Dog, Zap, CircleDollarSign, Sun, Building, Thermometer,
    Bus, Lock, ShieldCheck, CalendarDays
} from 'lucide-react'

export const runtime = 'edge'
export const revalidate = 60

// Icon mapping for features and facilities
const getFeatureIcon = (featureName: string) => {
    const name = featureName.toLowerCase();

    // Core Facilities
    if (name.includes('プール') || name.includes('pool')) return Waves;
    if (name.includes('ジム') || name.includes('fitness') || name.includes('gym')) return Dumbbell;
    if (name.includes('サウナ') || name.includes('sauna')) return Thermometer;
    if (name.includes('駐車場') || name.includes('parking')) return Car;
    if (name.includes('セキュリティ') || name.includes('security')) return ShieldCheck;
    if (name.includes('シャトル') || name.includes('shuttle') || name.includes('送迎')) return Bus;
    if (name.includes('オートロック') || name.includes('auto lock')) return Lock;

    // Spaces
    if (name.includes('コワーキング') || name.includes('working') || name.includes('多目的')) return Coffee;
    if (name.includes('キッズ') || name.includes('kids')) return Baby;
    if (name.includes('ラウンジ') || name.includes('lounge')) return Users;
    if (name.includes('レストラン') || name.includes('restaurant')) return Utensils;
    if (name.includes('コンシェルジュ') || name.includes('concierge')) return Users;

    // Appliances & Tech
    if (name.includes('テレビ') || name.includes('tv')) return Tv;
    if (name.includes('洗濯機') || name.includes('washing') || name.includes('washer')) return Sparkles;
    if (name.includes('冷蔵庫') || name.includes('refrigerator')) return Refrigerator;
    if (name.includes('wifi') || name.includes('ワイファイ')) return Wifi;
    if (name.includes('ウォシュレット') || name.includes('washlet')) return Sparkles;
    if (name.includes('エアコン') || name.includes('aircon')) return Wind;
    if (name.includes('ev充電') || name.includes('ev charger')) return Zap;

    // Characteristics
    if (name.includes('高層階') || name.includes('high floor')) return ArrowUp;
    if (name.includes('ペット可') || name.includes('pets')) return Dog;
    if (name.includes('築浅') || name.includes('new build') || name.includes('recent')) return CalendarDays;
    if (name.includes('格安') || name.includes('value')) return CircleDollarSign;
    if (name.includes('高級') || name.includes('luxury')) return Gem;
    if (name.includes('バルコニー') || name.includes('balcony')) return Sun;
    if (name.includes('オーシャン') || name.includes('ocean')) return Waves;
    if (name.includes('シティー') || name.includes('city')) return Building;
    if (name.includes('買い物') || name.includes('shopping') || name.includes('ロビンソン') || name.includes('robinson')) return ShoppingBag;

    return Check; // Fallback
}

export default async function PropertyDetailPage({ params }: { params: any }) {
    const resolvedParams = await params;
    const { id, locale } = resolvedParams;
    const dict = await getDictionary(locale)
    const supabase = await createClient()

    const [propertyRes, authRes] = await Promise.all([
        supabase.from('properties').select('*, area:areas(name, slug, region:regions(name)), project:projects(*, developers(name)), developers(name)').eq('id', id).single(),
        supabase.auth.getUser()
    ])

    const property = propertyRes.data
    const { data: { user } } = authRes

    if (!property) return notFound()

    const { data: agent } = property.user_id ? await supabase.from('profiles').select('phone, full_name').eq('id', property.user_id).single() : { data: null }
    const priceValue = property.is_for_rent ? property.rent_price : property.sale_price;

    const translateTag = (tag: string) => {
        return (dict.property.tags as any)?.[tag] || tag;
    }

    const translateArea = (areaName: string) => {
        return (dict.property.db_locations as any)?.[areaName] || areaName;
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20 font-sans tracking-normal">
            <BreadcrumbUpdater label={property.title} />

            <div className="container mx-auto max-w-7xl px-4 sm:px-6 pt-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* 左カラム (メイン) */}
                    <div className="lg:col-span-8 space-y-6">
                        <PropertyGallery images={property.images} />

                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                <div className="space-y-4 flex-1">
                                    <h1 className="text-lg md:text-xl font-medium text-navy-secondary leading-[1.3]">
                                        {property.title}
                                    </h1>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-500 text-xs font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span>{property.building_name || property.project?.name || 'Project Name'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{translateArea(property.area?.name || 'Area')}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[10px] text-slate-400 font-medium uppercase tracking-widest pt-1">
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                            <div className="flex gap-2">
                                                <span>{dict.property.year_built_label}</span>
                                                <span className="text-slate-600">{property.year_built || '--'}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span>{dict.property.total_floors_label}</span>
                                                <span className="text-slate-600">{property.total_floors ? `${property.total_floors}${dict.property.floor_suffix}` : `--${dict.property.floor_suffix}`}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span>{dict.property.listing_date_label}</span>
                                                <span className="text-slate-600">{new Date(property.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-baseline gap-2 pt-2 md:pt-0">
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                                                {dict.property.price_label}
                                            </span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl md:text-3xl font-semibold text-navy-secondary tracking-tight">
                                                    {priceValue?.toLocaleString()}
                                                </span>
                                                <span className="text-sm font-medium text-slate-400 uppercase tracking-normal">THB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: dict.property.property_type_label, value: property.property_type, icon: Building2 },
                                    { label: dict.property.area_size_label, value: `${property.sqm} ㎡`, icon: Maximize2 },
                                    { label: dict.property.floor_layout_label, value: `${property.floor}F / ${property.bedrooms}BR`, icon: Layers },
                                    { label: dict.property.bathrooms_label, value: property.bathrooms || '1', icon: Bath },
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#F8FAFF] rounded-2xl p-4 flex flex-col gap-1 border border-blue-50/30">
                                        <span className="text-[9px] font-medium text-slate-400 uppercase">{item.label}</span>
                                        <div className="flex items-center gap-1.5">
                                            <item.icon className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-sm font-medium text-[#2A4076]">{item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <PropertyDescription
                            description={property.description}
                            descriptionEn={property.description_en}
                            descriptionTh={property.description_th}
                            dict={dict}
                        />

                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
                            <h2 className="text-base font-semibold text-[#2A4076] mb-6 flex items-center">
                                <Gem className="w-5 h-5 mr-2 text-blue-600" /> {(dict.property.tags as any)?.["こだわり設備"] || "Amenities"}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {property.tags?.map((feature: string, index: number) => {
                                    const FeatureIcon = getFeatureIcon(feature);
                                    return (
                                        <div key={index} className="bg-[#F8FAFF] text-slate-600 py-2.5 px-4 rounded-xl text-xs font-medium flex items-center gap-2 border border-blue-50/50">
                                            <FeatureIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {translateTag(feature)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
                            <h2 className="text-base font-semibold text-[#2A4076] mb-8 flex items-center">
                                <Building2 className="w-5 h-5 mr-2 text-blue-600" /> {(dict.property.tags as any)?.["物件基本情報"] || "Property Information"}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                {[
                                    { label: dict.property.building_name_label, value: property.project?.name || property.building_name },
                                    { label: dict.property.year_built_title, value: property.year_built || property.project?.year_built || '--' },
                                    { label: dict.property.total_floors_title, value: property.total_floors ? `${property.total_floors}${dict.property.floor_suffix}` : '--' },
                                    { label: dict.property.developer_title, value: property.project?.developers?.name || '--' },
                                    { label: dict.property.area_title, value: translateArea(property.area?.name) },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                        <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                                        <span className="text-xs font-medium text-[#2A4076] text-right">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
                            <h2 className="text-base font-semibold text-[#2A4076] mb-6 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-blue-600" /> {(dict.property.tags as any)?.["共有施設"] || dict.property.shared_facilities_label}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(property.project?.facilities || property.project_facilities || []).map((facility: string, index: number) => {
                                    const FacilityIcon = getFeatureIcon(facility);
                                    return (
                                        <div key={index} className="bg-[#F8FAFF] py-2.5 px-4 rounded-xl text-xs font-medium flex items-center gap-2 border border-blue-50/50">
                                            <FacilityIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {translateTag(facility)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4">
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${property.project?.latitude || 12.9236},${property.project?.longitude || 100.8824}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#2A4076] hover:bg-[#1A2B56] text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                            >
                                <MapPin className="w-4 h-4" /> {dict.property.view_on_google_maps}
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <AgentProfileCard agentId={property.user_id} dict={dict} locale={locale} />
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 sticky top-24">
                            <LineContactButton property={{ id: property.id, title: property.title, price: `${priceValue?.toLocaleString()} THB`, url: '', refId: property.reference_id || property.id.slice(0, 8) }} variant="full" dict={dict} />
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <InquiryForm propertyId={id} propertyName={property.title} dict={dict} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 space-y-16">
                    <Suspense fallback={<div className="h-64 bg-white rounded-[2.5rem] animate-pulse" />}>
                        <AgentOtherProperties
                            agentId={property.user_id}
                            currentPropertyId={property.id}
                            agentName={agent?.full_name}
                            locale={locale}
                            dict={dict}
                        />
                    </Suspense>

                    <Suspense fallback={<div className="h-64 bg-white rounded-[2.5rem] animate-pulse" />}>
                        <RelatedProperties
                            buildingName={property.building_name}
                            projectName={property.project?.name}
                            currentPropertyId={property.id}
                            dict={dict}
                        />
                    </Suspense>
                </div>
            </div>

            <StickyContactBar property={{ id: property.id, title: property.title, price: `${priceValue?.toLocaleString()} THB`, url: '', refId: property.reference_id || property.id.slice(0, 8), agentId: property.user_id }} phoneNumber={agent?.phone} dict={dict} />
        </div>
    )
}
