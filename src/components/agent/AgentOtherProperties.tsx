import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, BedDouble, Bath, ArrowRight, Building2 } from 'lucide-react'

export default async function AgentOtherProperties({ agentId, currentPropertyId, agentName }: { agentId: string, currentPropertyId: string, agentName?: string }) {
    const supabase = await createClient()

    // Fetch other published properties by this agent
    const { data: properties } = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name)), project:projects(*)')
        .eq('user_id', agentId)
        .eq('status', 'published')
        .neq('id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(4)

    if (!properties || properties.length === 0) return null

    return (
        <div className="mt-20 mb-8 w-full max-w-[1400px] mx-auto overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-4 xl:px-0">
                <div>
                    <h2 className="text-lg font-black text-navy-secondary">
                        この担当者の他の物件
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                        Other properties by {agentName || 'this agent'}
                    </p>
                </div>
                <Link href={`/agents/${agentId}`} className="text-sm font-black text-navy-primary hover:text-indigo-600 transition-colors flex items-center gap-1 group">
                    すべて見る
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 xl:px-0">
                {properties.map(property => (
                    <Link key={property.id} href={`/properties/${property.id}`} className="group block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative">
                        {/* Thumbnail */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
                            {property.images && property.images.length > 0 ? (
                                <Image
                                    src={property.images[0]}
                                    alt={property.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2">
                                    <Building2 className="w-8 h-8 opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                {property.is_for_sale && <span className="text-[10px] font-black bg-white/95 text-navy-primary px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">売買</span>}
                                {property.is_for_rent && <span className="text-[10px] font-black bg-navy-primary/95 text-white px-3 py-1.5 rounded-lg shadow-sm uppercase backdrop-blur-sm tracking-widest">賃貸</span>}
                            </div>

                            {/* Gradient Overlay for bottom text styling */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>

                            {/* Area Badge on Image */}
                            <div className="absolute bottom-4 left-4 flex items-center text-[10px] font-bold text-white uppercase tracking-widest gap-1 drop-shadow-md">
                                <MapPin className="w-3.5 h-3.5 text-white" />
                                {property.area?.name || 'Area'}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h3 className="font-black text-navy-secondary text-base leading-tight line-clamp-2 mb-4 group-hover:text-navy-primary transition-colors min-h-[40px]">
                                {property.title}
                            </h3>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-auto">
                                <div className="text-xl font-black text-navy-secondary tabular-nums tracking-tight">
                                    <span className="text-xs text-slate-400 mr-1">฿</span>
                                    {property.is_for_rent ? property.rent_price?.toLocaleString() : property.is_for_sale ? property.sale_price?.toLocaleString() : property.price?.toLocaleString()}
                                    {property.is_for_rent && <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">/ 月</span>}
                                </div>

                                <div className="flex items-center gap-3 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl">
                                    <div className="flex items-center gap-1.5 text-[11px] font-black" title="間取り">
                                        <BedDouble className="w-3.5 h-3.5" />
                                        <span>{property.bedrooms === 0 ? 'ST' : property.bedrooms || 1}</span>
                                    </div>
                                    <div className="w-[1px] h-3 bg-slate-200"></div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-black" title="バスルーム">
                                        <Bath className="w-3.5 h-3.5" />
                                        <span>{property.bathrooms || 1}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
