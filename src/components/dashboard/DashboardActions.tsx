'use client'

import { useState } from 'react'
import { Edit3, Trash2, Loader2, Share2, ExternalLink, FileText } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { isPremium } from '@/lib/utils/plan'
const SocialShareDialog = dynamic(() => import('./SocialShareDialog'), {
    ssr: false
})

const PropertyPdfDownload = dynamic(
    () => import('../property/PropertyPdfDownload'),
    {
        loading: () => <div className="h-10 w-10 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />,
        ssr: false
    }
)

interface DashboardActionsProps {
    propertyId: string
    propertyTitle: string
    profile: any
    property: any
    agent: any
    dict: any
}

export default function DashboardActions({
    propertyId,
    propertyTitle,
    profile,
    property,
    agent,
    dict,
}: DashboardActionsProps) {
    const [loading, setLoading] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const hasPremium = isPremium(profile)

    const handleDelete = async () => {
        const confirmed = window.confirm(dict.delete_confirm.replace('{title}', propertyTitle))

        if (!confirmed) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId)

            if (error) {
                alert(`${dict.delete_failed}: ${error.message}`)
            } else {
                router.refresh()
            }
        } catch (err: any) {
            alert(`${dict.error_occurred}: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const premiumLink = `/${params.locale}/pricing`

    const shareDialog = hasPremium && (
        <SocialShareDialog
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            propertyContext={{
                id: propertyId,
                title: propertyTitle,
                price: property.is_for_sale ? property.sale_price : property.rent_price,
                isForSale: property.is_for_sale,
                isForRent: property.is_for_rent,
                mainImageUrl: property.images?.[0] || '',
                agentContact: agent?.phone || '',
                area: property.area?.name || '',
                description: property.description || property.description_ja || '',
                amenities: property.amenities || [],
                facilities: property.facilities || [],
                sqm: property.sqm || 0,
                floor: property.floor || '',
                layout: property.layout || ''
            }}
        />
    )

    return (
        <>
            {/* Mobile layout: 詳細, 編集, SNS, PDF, 削除 を均等に配置 */}
            <div className="sm:hidden flex items-stretch w-full divide-x divide-slate-100">
                <Link
                    href={`/properties/${propertyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-slate-500 active:bg-slate-50 active:scale-[0.95] transition-all"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{dict.detail}</span>
                </Link>

                <button
                    onClick={() => router.push(`/dashboard/edit/${propertyId}`)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-navy-primary active:bg-navy-primary/5 active:scale-[0.95] transition-all"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{dict.edit}</span>
                </button>

                {hasPremium && (
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-pink-500 active:bg-pink-50 active:scale-[0.95] transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{dict.sns}</span>
                    </button>
                )}

                {hasPremium && (
                    <div className="flex-1 flex flex-col items-center justify-center py-2.5 active:bg-slate-50 active:scale-[0.95] transition-all">
                        <PropertyPdfDownload property={property} agent={agent} dict={{}} iconOnly={true} />
                        <span className="text-[9px] font-black text-slate-500 mt-1">PDF</span>
                    </div>
                )}

                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-red-400 active:bg-red-50 active:scale-[0.95] transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{dict.delete}</span>
                </button>
            </div>

            {/* Desktop layout: icon buttons */}
            <div className="hidden sm:flex items-center space-x-1 lg:space-x-2">
                <Link 
                    href={`/properties/${propertyId}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all border border-slate-100 shadow-sm flex items-center gap-1 lg:gap-1.5 px-2 lg:px-4 whitespace-nowrap"
                    title={dict.detail_view}
                >
                    <ExternalLink className="w-3.5 h-3.5 lg:w-4 h-4" />
                    <span className="text-[10px] lg:text-xs font-bold">{dict.detail}</span>
                </Link>
                {hasPremium && (
                    <div title={dict.pdf_download} className="scale-90 lg:scale-100">
                        <PropertyPdfDownload property={property} agent={agent} dict={{}} iconOnly={true} />
                    </div>
                )}
                {hasPremium && (
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white transition-all border border-pink-100 shadow-sm"
                        title={dict.sns_generate}
                    >
                        <Share2 className="w-4 h-4 lg:w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={() => router.push(`/dashboard/edit/${propertyId}`)}
                    className="p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl bg-slate-50 text-navy-primary hover:bg-navy-primary hover:text-white transition-all border border-slate-100 shadow-sm"
                    title={dict.edit_action}
                >
                    <Edit3 className="w-4 h-4 lg:w-5 h-5" />
                </button>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-slate-100 disabled:opacity-50 shadow-sm"
                    title={dict.delete_action}
                >
                    {loading ? <Loader2 className="w-4 h-4 lg:w-5 h-5 animate-spin" /> : <Trash2 className="w-4 h-4 lg:w-5 h-5" />}
                </button>
            </div>
            {shareDialog}
        </>
    )
}
