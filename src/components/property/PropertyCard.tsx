'use client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bath, Dog, BedDouble } from 'lucide-react'
import FavoriteButton from './FavoriteButton'
import { useParams } from 'next/navigation'

interface PropertyCardProps {
    property: {
        id: string
        title: string
        title_en?: string
        title_th?: string
        price: number
        area_name: string
        city_name?: string
        images: string[]
        tags: string[]
        has_bathtub?: boolean
        allows_pets?: boolean
        sqm?: number
        bedrooms?: number
        is_for_rent?: boolean
        is_for_sale?: boolean
        rent_price?: number
        sale_price?: number
        ownership_type?: string
        is_presale?: boolean
        status?: string
    }
}

const CARD_IMAGE_SIZES =
    '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'

export default function PropertyCard({
    property,
    dict,
    imagePriority = false,
    hideFavoriteButton = false,
    openDetailInNewTab = false,
    imageOverlay,
}: {
    property: any
    dict: any
    imagePriority?: boolean
    hideFavoriteButton?: boolean
    /** 画像・本文とも物件詳細を別タブで開く */
    openDetailInNewTab?: boolean
    /** 画像エリア（aspect 4/3）内に重ねるオーバーレイ（例: 比較用チェック） */
    imageOverlay?: ReactNode
}) {
    const params = useParams()
    const locale = params?.locale as string || 'jp'
    const detailHref = `/${locale}/properties/${property.id}`
    const badgeRightClass = hideFavoriteButton ? 'right-4' : 'right-14'

    const getDisplayTitle = () => {
        if (locale === 'en' && property.title_en) return property.title_en;
        if (locale === 'th' && property.title_th) return property.title_th;
        return property.title;
    };

    const imageSection = (
        <>
            <Image
                src={property.images?.[0] || '/images/placeholder-property.jpg'}
                alt={property.title}
                fill
                sizes={CARD_IMAGE_SIZES}
                priority={imagePriority}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div
                className={`pointer-events-none absolute top-4 left-4 ${badgeRightClass} flex flex-wrap gap-2 overflow-hidden max-h-[60px]`}
            >
                {property.status === 'contracted' && (
                    <span className="bg-purple-600 text-white text-[10px] font-normal px-2 py-1 rounded-md shadow-lg tracking-widest uppercase">
                        {dict.property.contracted}
                    </span>
                )}
                {property.status === 'under_negotiation' && (
                    <span className="bg-blue-600 text-white text-[10px] font-normal px-2 py-1 rounded-md shadow-lg tracking-widest uppercase">
                        {dict.property.under_negotiation}
                    </span>
                )}
                {property.is_presale && (
                    <span className="bg-amber-500 text-white text-[10px] font-normal px-2 py-1 rounded-md shadow-sm tracking-wider shrink-0">
                        {dict.property.presale}
                    </span>
                )}
                {property.tags &&
                    Array.isArray(property.tags) &&
                    property.tags.slice(0, property.is_presale ? 1 : 2).map((tag: string) => (
                        <span
                            key={tag}
                            className="bg-white/90 backdrop-blur-sm text-navy-primary text-[10px] font-normal px-2 py-1 rounded-md shadow-sm truncate max-w-[100px] shrink-0"
                        >
                            {dict.property.tags?.[tag] || tag}
                        </span>
                    ))}
            </div>
        </>
    )

    const bodySection = (
        <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center text-slate-500 text-xs mb-2">
                                <MapPin className="w-3 h-3 mr-1" />
                                {property.city_name ? `${dict.property.db_locations[property.city_name] || property.city_name} / ` : ''}
                                {dict.property.db_locations[property.area_name] || property.area_name}
                            </div>
                            <h3 className="text-lg font-normal text-navy-secondary mb-1 line-clamp-1">{getDisplayTitle()}</h3>
                            <div className="flex items-center space-x-3 text-[11px] font-normal text-slate-400 uppercase tracking-wider mb-3">
                                <span>{property.sqm || '--'} sqm</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <div className="flex items-center">
                                    <BedDouble className="w-3 h-3 mr-1" />
                                    <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}BR`}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                            <div className="flex flex-col space-y-1">
                                {property.is_for_rent && (
                                    <div className="text-lg font-normal text-navy-secondary leading-none">
                                        <span className="text-[10px] font-normal text-slate-400 mr-1 uppercase">{dict.property.rent_label}</span>
                                        {property.rent_price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{dict.property.per_month}</span>
                                    </div>
                                )}
                                 {property.is_for_sale && (
                                    <div className="space-y-1">
                                        <div className="text-lg font-normal text-navy-secondary leading-none">
                                            <span className="text-[10px] font-normal text-slate-400 mr-1 uppercase">{dict.property.sale_label}</span>
                                            {property.sale_price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">THB</span>
                                        </div>
                                        {property.ownership_type && (
                                            <div className="text-[9px] font-normal text-navy-secondary bg-navy-secondary/5 w-fit px-1.5 py-0.5 rounded border border-navy-secondary/10">
                                                {property.ownership_type}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!property.is_for_rent && !property.is_for_sale && (
                                    <div className="text-lg font-normal text-navy-secondary">
                                        {property.price?.toLocaleString()} <span className="text-xs font-normal text-slate-500">THB</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                {property.has_bathtub && (
                                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm" title={dict.property.bathtub}>
                                        <Bath className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                )}
                                {property.allows_pets && (
                                    <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100 shadow-sm" title={dict.property.pets_allowed}>
                                        <Dog className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
    )

    return (
        <div className="relative group h-full">
            {!hideFavoriteButton ? (
                <div className="absolute top-4 right-4 z-20">
                    <FavoriteButton
                        propertyId={property.id}
                        loginRequiredMessage={dict.property.favorite_login_required}
                        favoriteAddAria={dict.property.favorite_add_aria}
                        favoriteRemoveAria={dict.property.favorite_remove_aria}
                    />
                </div>
            ) : null}

            {openDetailInNewTab ? (
                <a
                    href={detailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full outline-none transition-transform duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-navy-primary focus-visible:ring-offset-2 rounded-2xl"
                >
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-lg">
                        <div className="relative w-full shrink-0 aspect-[4/3] overflow-hidden bg-slate-100">
                            {imageSection}
                            {imageOverlay}
                        </div>
                        {bodySection}
                    </div>
                </a>
            ) : (
                <Link
                    href={detailHref}
                    prefetch={false}
                    className="block h-full transition-transform active:scale-[0.98] duration-200"
                >
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg">
                        <div className="relative w-full shrink-0 aspect-[4/3] overflow-hidden bg-slate-100">
                            {imageSection}
                            {imageOverlay}
                        </div>
                        {bodySection}
                    </div>
                </Link>
            )}
        </div>
    )
}
