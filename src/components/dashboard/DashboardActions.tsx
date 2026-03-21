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
}

export default function DashboardActions({
    propertyId,
    propertyTitle,
    profile,
    property,
    agent
}: DashboardActionsProps) {
    const [loading, setLoading] = useState(false)
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const hasPremium = isPremium(profile)

    const handleDelete = async () => {
        const confirmed = window.confirm(`「${propertyTitle}」を削除しますか？この処理をすると戻せません。`)

        if (!confirmed) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId)

            if (error) {
                alert('削除に失敗しました: ' + error.message)
            } else {
                router.refresh()
            }
        } catch (err: any) {
            alert('エラーが発生しました: ' + err.message)
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
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-slate-500 active:bg-slate-50 active:scale-[0.95] transition-all"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>詳細</span>
                </Link>

                <button
                    onClick={() => router.push(`/dashboard/edit/${propertyId}`)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-navy-primary active:bg-navy-primary/5 active:scale-[0.95] transition-all"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>編集</span>
                </button>

                {hasPremium && (
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black text-pink-500 active:bg-pink-50 active:scale-[0.95] transition-all"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>SNS</span>
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
                    <span>削除</span>
                </button>
            </div>

            {/* Desktop layout: icon buttons */}
            <div className="hidden sm:flex items-center space-x-2">
                {hasPremium && (
                    <div title="PDFチラシをダウンロード">
                        <PropertyPdfDownload property={property} agent={agent} dict={{}} iconOnly={true} />
                    </div>
                )}
                {hasPremium && (
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-2.5 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white transition-all border border-pink-100 shadow-sm"
                        title="SNS用コピー&バナー画像を生成"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={() => router.push(`/dashboard/edit/${propertyId}`)}
                    className="p-2.5 rounded-xl bg-slate-50 text-navy-primary hover:bg-navy-primary hover:text-white transition-all border border-slate-100 shadow-sm"
                    title="編集する"
                >
                    <Edit3 className="w-5 h-5" />
                </button>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="p-2.5 rounded-xl bg-slate-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-slate-100 disabled:opacity-50 shadow-sm"
                    title="削除する"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
            </div>
            {shareDialog}
        </>
    )
}
