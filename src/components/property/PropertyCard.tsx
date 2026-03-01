import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Bath, Dog } from 'lucide-react'

interface PropertyCardProps {
    property: {
        id: string
        title: string
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


export default function PropertyCard({ property }: PropertyCardProps) {
    return (
        <Link href={`/properties/${property.id}`} className="block group">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-100 h-full flex flex-col">
                <div className="relative h-48 w-full overflow-hidden">
                    <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {property.status === 'contracted' && (
                            <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg tracking-widest uppercase">
                                成約済
                            </span>
                        )}
                        {property.status === 'under_negotiation' && (
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg tracking-widest uppercase">
                                商談中
                            </span>
                        )}
                        {property.is_presale && (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm tracking-wider">
                                プレセール
                            </span>
                        )}
                        {property.tags.slice(0, property.is_presale ? 1 : 2).map((tag) => (
                            <span key={tag} className="bg-white/90 backdrop-blur-sm text-navy-primary text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center text-slate-500 text-xs mb-2">
                            <MapPin className="w-3 h-3 mr-1" />
                            {property.city_name ? `${property.city_name} / ` : ''}{property.area_name}
                        </div>
                        <h3 className="text-lg font-bold text-navy-secondary mb-1 line-clamp-1">{property.title}</h3>
                        <div className="flex items-center space-x-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                            <span>{property.sqm || '--'} sqm</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms}BR`}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                        <div className="flex flex-col space-y-1">
                            {property.is_for_rent && (
                                <div className="text-lg font-black text-navy-primary leading-none">
                                    <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Rent:</span>
                                    {property.rent_price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">THB / 月</span>
                                </div>
                            )}
                            {property.is_for_sale && (
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-navy-primary leading-none">
                                        <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Sale:</span>
                                        {property.sale_price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">THB</span>
                                    </div>
                                    {property.ownership_type && (
                                        <div className="text-[9px] font-bold text-navy-primary bg-navy-primary/5 w-fit px-1.5 py-0.5 rounded border border-navy-primary/10">
                                            {property.ownership_type}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!property.is_for_rent && !property.is_for_sale && (
                                <div className="text-lg font-black text-navy-primary">
                                    {property.price?.toLocaleString()} <span className="text-xs font-normal text-slate-500">THB</span>
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            {property.has_bathtub && (
                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm" title="バスタブあり">
                                    <Bath className="w-3.5 h-3.5 text-blue-500" />
                                </div>
                            )}
                            {property.allows_pets && (
                                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100 shadow-sm" title="ペット可">
                                    <Dog className="w-3.5 h-3.5 text-amber-500" />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </Link>
    )
}
