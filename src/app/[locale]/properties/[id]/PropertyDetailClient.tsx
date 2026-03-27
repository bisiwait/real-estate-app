"use client";
import { createClient } from '@/lib/supabase/client'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { useAuth } from '@/contexts/AuthContext'
import BreadcrumbUpdater from '@/components/layout/BreadcrumbUpdater'

const PropertyGallery = dynamic(() => import('@/components/property/PropertyGallery'), { ssr: false })
const RelatedProperties = dynamic(() => import('@/components/property/RelatedProperties'), { ssr: false })
const AgentOtherProperties = dynamic(() => import('@/components/agent/AgentOtherProperties'), { ssr: false })
const InquiryForm = dynamic(() => import('@/components/property/InquiryForm'), { ssr: false })
const PropertyLocationMap = dynamic(() => import('@/components/property/PropertyLocationMap'), { ssr: false })

import PropertyDescription from '@/components/property/PropertyDescription'
import AgentProfileCard from '@/components/agent/AgentProfileCard'
import StickyContactBar from '@/components/property/StickyContactBar'
import LineContactButton from '@/components/property/LineContactButton'
import ContactAuthRequiredModal from '@/components/property/ContactAuthRequiredModal'
import { getOfficialLineAddFriendUrl } from '@/lib/line-official'
import { propertyProjectOpenMapsUrl } from '@/lib/google-maps-url'
import {
    MapPin, Building2, Bath, Layers, Maximize2, Check, Gem, Sparkles,
    Waves, Dumbbell, Car, Users, Baby, Tv, Wind, Utensils,
    Wifi, Refrigerator, ArrowUp, Dog, Zap, CircleDollarSign, Sun, Building, Thermometer,
    Bus, Lock, ShieldCheck, CalendarDays, RefreshCw, Loader2
} from 'lucide-react'

const getFeatureIcon = (featureName: string) => {
    const name = featureName.toLowerCase();
    if (name.includes('プール') || name.includes('pool')) return Waves;
    if (name.includes('ジム') || name.includes('fitness') || name.includes('gym') || name.includes('フィットネス')) return Dumbbell;
    if (name.includes('サウナ') || name.includes('sauna')) return Thermometer;
    if (name.includes('駐車場') || name.includes('parking')) return Car;
    if (name.includes('セキュリティ') || name.includes('security')) return ShieldCheck;
    if (name.includes('シャトル') || name.includes('shuttle')) return Bus;
    if (name.includes('オートロック') || name.includes('auto lock')) return Lock;
    if (name.includes('キッズ') || name.includes('kids')) return Baby;
    if (name.includes('ラウンジ') || name.includes('lounge') || name.includes('多目的')) return Users;
    if (name.includes('テレビ') || name.includes('tv')) return Tv;
    if (name.includes('洗濯機') || name.includes('washing')) return Sparkles;
    if (name.includes('冷蔵庫') || name.includes('refrigerator')) return Refrigerator;
    if (name.includes('wifi')) return Wifi;
    if (name.includes('エアコン') || name.includes('aircon')) return Wind;
    if (name.includes('ev充電') || name.includes('ev charger')) return Zap;
    if (name.includes('高級') || name.includes('luxury')) return Gem;
    if (name.includes('オーシャン') || name.includes('ocean')) return Waves;
    if (name.includes('バスタブ') || name.includes('bathtub')) return Bath;
    if (name.includes('ウォシュレット') || name.includes('washlet')) return Sparkles;
    if (name.includes('ペット') || name.includes('pet')) return Dog;
    if (name.includes('バルコニー') || name.includes('balcony')) return Sun;
    if (name.includes('格安') || name.includes('value')) return CircleDollarSign;
    if (name.includes('高層') || name.includes('high floor')) return ArrowUp;
    if (name.includes('シティービュー') || name.includes('city view')) return Building;
    if (name.includes('築浅') || name.includes('new')) return Sparkles;
    if (name.includes('コンシェルジュ') || name.includes('concierge')) return ShieldCheck;
    if (name.includes('レストラン') || name.includes('restaurant')) return Utensils;
    return Check;
}

interface PropertyDetailClientProps {
    initialProperty: any
}

export default function PropertyDetailClient({ initialProperty }: PropertyDetailClientProps) {
    const params = useParams()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const id = params?.id as string
    const locale = (params?.locale as string) || 'jp'
    const { user } = useAuth()
    const [contactAuthOpen, setContactAuthOpen] = useState(false)

    const returnPath = `${pathname || `/${locale}/properties/${id}`}${searchParams?.toString() ? `?${searchParams}` : ''}`
    
    // サーバーから受け取った初期データを使用
    const [property, setProperty] = useState<any>(initialProperty)
    const [agent, setAgent] = useState<any>(null)
    const [dict, setDict] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeLang, setActiveLang] = useState<'jp' | 'en' | 'th'>(locale as any || 'jp')
    const [translatingTitle, setTranslatingTitle] = useState(false)
    const [profile, setProfile] = useState<any>(null)

    const isPremium = profile?.plan === 'premium' || profile?.plan_type === 'premium'

    const contactPrefill = useMemo(() => {
        if (!user) return null
        return {
            full_name: profile?.full_name ?? null,
            email: user.email ?? profile?.email ?? null,
            phone: profile?.phone ?? null,
            line_id: profile?.line_id ?? null,
        }
    }, [user, profile])

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchClientData = async () => {
            const supabase = createClient()
            // 辞書と追加データのみクライアントで取得
            const d = await getDictionary(locale)
            setDict(d)

            // エージェント情報の取得
            if (initialProperty?.user_id) {
                const { data: aData } = await supabase.from('profiles').select('phone, full_name').eq('id', initialProperty.user_id).single()
                setAgent(aData)
            }

            // ログインユーザーのプラン・問い合わせ用プロフィール
            if (user) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('plan, plan_type, full_name, phone, line_id, email')
                    .eq('id', user.id)
                    .single()
                if (pData) setProfile(pData)
            } else {
                setProfile(null)
            }

            setLoading(false)
        }
        fetchClientData()
    }, [id, locale, user, initialProperty])

    useEffect(() => {
        const translateTitleOnDemand = async () => {
            if (!property || translatingTitle) return;
            
            const needsEn = activeLang === 'en' && !property.title_en;
            const needsTh = activeLang === 'th' && !property.title_th;
            
            if (needsEn || needsTh) {
                setTranslatingTitle(true);
                try {
                    const res = await fetch(`/api/translate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            id: property.id, 
                            title: property.title_ja || property.title 
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setProperty((prev: any) => ({
                            ...prev,
                            title_en: data.title_en || prev.title_en,
                            title_th: data.title_th || prev.title_th
                        }));
                    }
                } catch (error) {
                    console.error("Failed to translate title:", error);
                } finally {
                    setTranslatingTitle(false);
                }
            }
        };

        translateTitleOnDemand();
    }, [activeLang, property?.id, property?.title_en, property?.title_th, translatingTitle]);

    if (loading || !dict || !property) {
        return <div className="p-20 flex justify-center"><RefreshCw className="animate-spin text-navy-primary w-10 h-10" /></div>
    }

    const priceValue = property.is_for_rent ? property.rent_price : property.sale_price;
    const translateTag = (tag: string) => (dict.property.tags as any)?.[tag] || tag;
    const translateArea = (areaName: string) => (dict.property.db_locations as any)?.[areaName] || areaName;

    const getDisplayTitle = () => {
        if (activeLang === 'en' && property.title_en) return property.title_en;
        if (activeLang === 'th' && property.title_th) return property.title_th;
        return property.title_ja || property.title;
    };
    const displayTitle = getDisplayTitle();

    const getProjectDisplayName = (proj: any) => {
        if (!proj) return '-';
        const name = proj.name || '';
        const nameJp = proj.name_jp || '';
        if (locale === 'jp' && name && nameJp) {
            return `${name} (${nameJp})`;
        }
        return name || nameJp || '-';
    };
    const projectDisplayName = getProjectDisplayName(property.project)

    const mapSearchHint = useMemo(() => {
        const parts = [displayTitle, property.building_name, projectDisplayName].filter(
            (s): s is string => typeof s === 'string' && s.trim().length > 0 && s !== '-'
        )
        return parts.join(' ').trim() || null
    }, [displayTitle, property.building_name, projectDisplayName])

    const openMapsHref = useMemo(
        () =>
            propertyProjectOpenMapsUrl(property.project, {
                mapSearchHint,
            }),
        [
            property.project?.google_maps_share_url,
            property.project?.google_place_id,
            property.project?.latitude,
            property.project?.longitude,
            property.project?.name,
            property.project?.name_jp,
            mapSearchHint,
        ]
    )

    const amenityTags = (property.tags || []).filter((t: string) => typeof t === 'string' && t.trim().length > 0)
    const sharedFacilitiesList = (property.project?.facilities || property.project_facilities || []).filter(
        (f: string) => typeof f === 'string' && f.trim().length > 0
    )

    return (
        <div className="bg-slate-50 min-h-screen pb-20 font-sans tracking-normal">
            <ContactAuthRequiredModal
                open={contactAuthOpen}
                onClose={() => setContactAuthOpen(false)}
                locale={locale}
                dictProperty={dict.property || {}}
                returnPath={returnPath}
            />
            <BreadcrumbUpdater label={displayTitle} />
            <div className="container mx-auto max-w-7xl px-4 pt-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6">
                        <PropertyGallery images={property.images} />
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-50">
                            <div className="space-y-6 mb-10">
                                <h1 className="text-[20px] md:text-[24px] font-normal text-[#1A2B56] leading-tight tracking-normal flex items-center gap-3">
                                    {displayTitle}
                                    {translatingTitle && <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />}
                                </h1>
                                <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-slate-500 text-[13px] font-normal">
                                            <div className="flex items-center gap-2.5"><Building2 className="w-4.5 h-4.5 text-blue-500" /> <span className="text-slate-700">{property.building_name || projectDisplayName}</span></div>
                                            <div className="flex items-center gap-2.5 uppercase tracking-wide text-[11px]"><MapPin className="w-4.5 h-4.5 text-blue-500" /> <span className="text-[#1A2B56]">{property.area?.region?.name || ''} ・ {translateArea(property.area?.name || '')}</span></div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-slate-400 text-[11px] font-normal">
                                            <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-slate-300" /> {dict.property.year_built_title}: {property.year_built || property.project?.year_built || '-'}</div>
                                            <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-300" /> {dict.property.total_floors_title}: {property.total_floors || property.project?.total_floors ? `${property.total_floors || property.project?.total_floors}${dict.property.floor_suffix}` : '-'}</div>
                                            <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-slate-300" /> {dict.property.listing_date_label}: {new Date(property.created_at).toLocaleDateString('ja-JP')}</div>
                                        </div>
                                    </div>
                                    <div className="lg:text-right flex flex-col lg:items-end shrink-0">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">{dict.property.rent_label} / 月</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-[36px] font-normal text-[#1A2B56] tabular-nums leading-none tracking-tight">{priceValue?.toLocaleString()}</span>
                                            <span className="text-sm font-normal text-slate-400 uppercase">THB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <DetailBox label={dict.property.property_type_label} value={property.property_type} icon={Building2} />
                                <DetailBox label={dict.property.area_size_label} value={`${property.sqm} ㎡`} icon={Maximize2} />
                                <DetailBox label={dict.property.floor_layout_label} value={`${property.floor}F / ${property.bedrooms}BR`} icon={Layers} />
                                <DetailBox label={dict.property.bathrooms_label} value={property.bathrooms || '1'} icon={Bath} />
                            </div>
                        </div>
 
                        <PropertyDescription description={property.description} descriptionEn={property.description_en} descriptionTh={property.description_th} dict={dict} activeLang={activeLang} setActiveLang={setActiveLang} isPremium={isPremium} />

                        {amenityTags.length > 0 ? (
                            <SectionBox title={translateTag("こだわり設備")} icon={Gem}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {amenityTags.map((t: string, i: number) => (
                                        <TagItem key={i} tag={t} icon={getFeatureIcon(t)} translate={translateTag} />
                                    ))}
                                </div>
                            </SectionBox>
                        ) : null}

                        <SectionBox title={dict.property.building_info_label} icon={Building}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                <InfoItem label={dict.property.building_name_label} value={property.building_name || projectDisplayName} />
                                <InfoItem label={dict.property.year_built_title} value={property.year_built || property.project?.year_built || '-'} />
                                <InfoItem label={dict.property.total_floors_title} value={property.total_floors || property.project?.total_floors ? `${property.total_floors || property.project?.total_floors}${dict.property.floor_suffix}` : '-'} />
                                <InfoItem label={dict.property.total_units_label} value={property.total_units || property.project?.total_units ? `${property.total_units || property.project?.total_units}${locale === 'jp' ? '戸' : ' Units'}` : '-'} />
                                <InfoItem label={dict.property.developer_label} value={property.developer || property.project?.developers?.name || '-'} />
                                <InfoItem label={dict.property.area_title} value={translateArea(property.area?.name || 'Area')} />
                            </div>
                        </SectionBox>

                        {sharedFacilitiesList.length > 0 ? (
                            <SectionBox title={dict.property.shared_facilities_label} icon={Sparkles}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {sharedFacilitiesList.map((f: string, i: number) => (
                                        <TagItem key={i} tag={f} icon={getFeatureIcon(f)} translate={translateTag} />
                                    ))}
                                </div>
                            </SectionBox>
                        ) : null}

                        <div className="space-y-4 pt-4">
                            <PropertyLocationMap
                                mapsShareUrl={property.project?.google_maps_share_url}
                                googlePlaceId={property.project?.google_place_id}
                                latitude={property.project?.latitude}
                                longitude={property.project?.longitude}
                                propertyTitle={displayTitle}
                                openInMapsUrl={openMapsHref}
                            />
                            <a href={openMapsHref} target="_blank" rel="noopener noreferrer" className="flex w-full justify-center gap-2 rounded-2xl bg-[#2A4076] py-4 font-bold text-white shadow-lg hover:bg-[#1A2B56]">
                                <MapPin className="h-4 w-4" /> {dict.property.view_on_google_maps}
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <AgentProfileCard agentId={property.user_id} dict={dict} locale={locale} />
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 sticky top-24">
                            <LineContactButton
                                property={{ id: property.id, title: displayTitle, price: `${priceValue?.toLocaleString()} THB`, url: '', refId: property.reference_id || property.id.slice(0, 8), agentId: property.user_id }}
                                variant="full"
                                dict={dict}
                                isLoggedIn={!!user}
                                onRequireAuth={() => setContactAuthOpen(true)}
                            />

                            <div className="mt-8 border-t border-slate-100 pt-8">
                                <InquiryForm
                                    propertyId={id}
                                    propertyName={displayTitle}
                                    dict={dict}
                                    isLoggedIn={!!user}
                                    onRequireAuth={() => setContactAuthOpen(true)}
                                    contactPrefill={contactPrefill}
                                    officialLineAddFriendUrl={getOfficialLineAddFriendUrl()}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 space-y-16">
                    <RelatedProperties buildingName={property.building_name} projectName={property.project?.name} currentPropertyId={property.id} dict={dict} />
                    <AgentOtherProperties agentId={property.user_id} currentPropertyId={property.id} agentName={agent?.full_name} locale={locale} dict={dict} />
                </div>
            </div>
            <StickyContactBar
                property={{ id: property.id, title: displayTitle, price: `${priceValue?.toLocaleString()} THB`, url: '', refId: property.reference_id || property.id.slice(0, 8), agentId: property.user_id }}
                phoneNumber={agent?.phone}
                dict={dict}
                isLoggedIn={!!user}
                onRequireAuth={() => setContactAuthOpen(true)}
            />
        </div>
    )
}

function DetailBox({ label, value, icon: Icon }: any) {
    return (
        <div className="bg-[#F8FAFF] rounded-2xl p-5 flex flex-col gap-2 border border-blue-100/50">
            <span className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2.5">
                <Icon className="w-4.5 h-4.5 text-blue-500" />
                <span className="text-sm md:text-base font-normal text-[#1A2B56] leading-none">{value}</span>
            </div>
        </div>
    )
}

function SectionBox({ title, icon: Icon, children }: any) {
    return (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-normal text-[#2A4076] mb-6 flex items-center"><Icon className="w-5 h-5 mr-2 text-blue-600" /> {title}</h2>
            {children}
        </div>
    )
}

function TagItem({ tag, icon: Icon, translate }: any) {
    return (
        <div className="bg-[#F8FAFF] text-slate-600 py-2.5 px-4 rounded-xl text-[11px] font-normal flex items-center gap-2 border border-blue-50/50">
            <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {translate(tag)}
        </div>
    )
}

function InfoItem({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center border-b border-slate-100/50 py-4 px-2">
            <span className="text-slate-400 text-[13px] font-normal w-[160px] shrink-0">{label}</span>
            <span className="text-[#1A2B56] font-normal text-[15px]">{value}</span>
        </div>
    )
}
