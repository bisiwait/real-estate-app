'use client'

import Link from 'next/link'
import { ChevronRight, LayoutDashboard, MessageCircle } from 'lucide-react'
import FreshnessBadge from '@/components/dashboard/FreshnessBadge'
import PropertyConfirmButton from '@/components/dashboard/PropertyConfirmButton'
import DashboardActions from '@/components/dashboard/DashboardActions'
import PropertyEndListingButton from '@/components/dashboard/PropertyEndListingButton'
import PropertyRepublishButton from '@/components/dashboard/PropertyRepublishButton'

function PropertyLineInquiryBadge({ count, className = '' }: { count: number; className?: string }) {
    const active = count > 0
    return (
        <span
            className={`inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black tabular-nums ${
                active
                    ? 'border-[#06C755]/35 bg-[#06C755]/10 text-[#047c3d]'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
            } ${className}`}
            title="この物件のLINE問い合わせ導線の件数（今月・日本時間）"
        >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            <span>{count}</span>
            <span className="sr-only">LINE問い合わせ 今月</span>
        </span>
    )
}

export type DashboardPropertyRowProps = {
    property: any
    profile: any
    lineInquiryCountsByPropertyThisMonth: Record<string, number>
    patchProperty: (id: string, patch: Record<string, unknown>) => void
}

export function DashboardMobilePropertyRow({
    property,
    profile,
    lineInquiryCountsByPropertyThisMonth,
    patchProperty,
}: DashboardPropertyRowProps) {
    return (
        <div className="p-3 active:bg-slate-50 transition-colors">
            <div className="flex gap-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 shadow-sm">
                    {property.images?.[0] ? (
                        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                    )}
                    <div className="absolute top-1 left-1">
                        {property.status === 'published' && (
                            <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">公開</span>
                        )}
                        {property.status === 'pending' && (
                            <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">待ち</span>
                        )}
                        {property.status === 'draft' && (
                            <span className="bg-slate-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">下書</span>
                        )}
                        {property.status === 'under_negotiation' && (
                            <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">商談</span>
                        )}
                        {property.status === 'contracted' && (
                            <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">成約</span>
                        )}
                        {property.status === 'expired' && (
                            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black shadow-sm">期限切</span>
                        )}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        {property.is_presale && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-amber-200">
                                PRESALE
                            </span>
                        )}
                        {!property.is_presale && property.is_for_rent && (
                            <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-100">
                                RENT
                            </span>
                        )}
                        {!property.is_presale && property.is_for_sale && (
                            <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-orange-100">
                                SALE
                            </span>
                        )}
                        <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-black text-navy-secondary leading-tight line-clamp-2 min-w-0">{property.title}</p>
                        <PropertyLineInquiryBadge count={lineInquiryCountsByPropertyThisMonth[property.id] ?? 0} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{property.area?.name || '—'}</p>
                    <div className="text-[13px] font-black text-navy-primary mt-1 tabular-nums">
                        {property.is_for_rent && <span className="mr-3">{property.rent_price?.toLocaleString()} ฿/月</span>}
                        {property.is_for_sale && <span>{property.sale_price?.toLocaleString()} ฿</span>}
                    </div>
                </div>
            </div>
            <div className="mt-2 flex items-stretch bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="flex-1 flex items-center justify-center">
                    <DashboardActions
                        propertyId={property.id}
                        propertyTitle={property.title}
                        profile={profile}
                        property={property}
                        agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                    />
                </div>
            </div>
            <div className="mt-2 flex gap-2 px-1">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <PropertyEndListingButton
                        propertyId={property.id}
                        currentStatus={property.status}
                        onEnded={(id) => patchProperty(id, { status: 'draft' })}
                    />
                    <PropertyRepublishButton
                        propertyId={property.id}
                        currentStatus={property.status}
                        isApproved={!!property.is_approved}
                        className="min-w-0 flex-1"
                        onRepublished={(id, newStatus) => patchProperty(id, { status: newStatus })}
                    />
                </div>
                <div className="flex min-w-0 flex-1">
                    <PropertyConfirmButton propertyId={property.id} title={property.title} />
                </div>
            </div>
        </div>
    )
}

export function DashboardDesktopPropertyRow({
    property,
    profile,
    lineInquiryCountsByPropertyThisMonth,
    patchProperty,
}: DashboardPropertyRowProps) {
    return (
        <div className="p-4 lg:p-6 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 lg:gap-6">
            <div className="flex items-center space-x-4 lg:space-x-6 min-w-0 flex-1">
                <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {property.images?.[0] ? (
                        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <LayoutDashboard className="w-6 h-6 lg:w-8 lg:h-8" />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        {property.status === 'published' && (
                            <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">公開中</span>
                        )}
                        {property.status === 'pending' && (
                            <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">承認待ち</span>
                        )}
                        {property.status === 'draft' && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">下書き</span>
                        )}
                        {property.status === 'under_negotiation' && (
                            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">商談中</span>
                        )}
                        {property.status === 'contracted' && (
                            <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold">成約済</span>
                        )}
                        {property.status === 'expired' && (
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">期限切れ</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium hidden lg:inline">#{property.id.slice(0, 8)}</span>
                        <FreshnessBadge lastConfirmedAt={property.last_confirmed_at} createdAt={property.created_at} />
                        <PropertyEndListingButton
                            propertyId={property.id}
                            currentStatus={property.status}
                            onEnded={(id) => patchProperty(id, { status: 'draft' })}
                        />
                        <PropertyRepublishButton
                            propertyId={property.id}
                            currentStatus={property.status}
                            isApproved={!!property.is_approved}
                            onRepublished={(id, newStatus) => patchProperty(id, { status: newStatus })}
                        />
                    </div>
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                        <h4 className="text-sm lg:text-lg font-bold text-navy-secondary truncate min-w-0 flex-1">{property.title}</h4>
                        <PropertyLineInquiryBadge
                            count={lineInquiryCountsByPropertyThisMonth[property.id] ?? 0}
                            className="shrink-0"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs lg:text-sm font-medium">
                        <span className="text-slate-400">{property.area?.name || 'Unknown Area'}</span>
                        {property.is_for_rent && (
                            <span className="text-navy-primary font-bold tabular-nums">
                                <span className="text-[9px] opacity-50 uppercase mr-1">Rent</span>
                                {property.rent_price?.toLocaleString()}
                            </span>
                        )}
                        {property.is_for_sale && (
                            <span className="text-navy-primary font-bold tabular-nums">
                                <span className="text-[9px] opacity-50 uppercase mr-1">Sale</span>
                                {property.sale_price?.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-1">
                    {property.is_presale ? (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[9px] font-black border border-amber-200">PS</span>
                    ) : (
                        <>
                            {property.is_for_rent && (
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 uppercase">
                                    R
                                </span>
                            )}
                            {property.is_for_sale && (
                                <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-orange-100 uppercase">
                                    S
                                </span>
                            )}
                        </>
                    )}
                </div>
                <Link
                    href={`/properties/${property.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-100 flex items-center hidden"
                >
                    <span className="hidden lg:inline">詳細</span>
                    <ChevronRight className="w-4 h-4" />
                </Link>
                <PropertyConfirmButton propertyId={property.id} title={property.title} />
                <DashboardActions
                    propertyId={property.id}
                    propertyTitle={property.title}
                    profile={profile}
                    property={property}
                    agent={{ full_name: profile?.full_name, phone: profile?.phone }}
                />
            </div>
        </div>
    )
}
