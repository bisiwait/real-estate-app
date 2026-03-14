'use client'

import { useState } from 'react'
import { Edit3, Trash2, Loader2, Sparkles, Crown, Share2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
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

    return (
        <div className="flex items-center space-x-2">
            {/* AI Generation Entry Point */}
            {hasPremium ? (
                <button
                    onClick={() => router.push(`/dashboard/edit/${propertyId}?tab=ai`)}
                    className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm"
                    title="AIで紹介文を生成"
                >
                    <Sparkles className="w-5 h-5" />
                </button>
            ) : (
                <button
                    onClick={() => router.push(premiumLink)}
                    className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm flex items-center justify-center group"
                    title="プレミアム会員限定: AI生成"
                >
                    <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            )}

            {/* PDF Generation Entry Point */}
            {hasPremium ? (
                <div title="PDFチラシをダウンロード">
                    <PropertyPdfDownload
                        property={property}
                        agent={agent}
                        dict={{}}
                        iconOnly={true}
                    />
                </div>
            ) : (
                <button
                    onClick={() => router.push(premiumLink)}
                    className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm flex items-center justify-center group"
                    title="プレミアム会員限定: PDF作成"
                >
                    <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            )}

            {/* SNS Share Entry Point */}
            {hasPremium ? (
                <>
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-2.5 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white transition-all border border-pink-100 shadow-sm"
                        title="SNS用コピー&バナー画像を生成"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
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
                            snsCopyJa: property.sns_copy_ja || '',
                            snsCopyEn: property.sns_copy_en || '',
                            snsCopyTh: property.sns_copy_th || '',
                            area: property.area?.name || '',
                            description: property.description_ja || '',
                            amenities: property.amenities || [],
                            facilities: property.facilities || [],
                            sqm: property.sqm || 0,
                            floor: property.floor || ''
                        }}
                    />
                </>
            ) : (
                <button
                    onClick={() => router.push(premiumLink)}
                    className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm flex items-center justify-center group"
                    title="プレミアム会員限定: SNSシェア画像生成"
                >
                    <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
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
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Trash2 className="w-5 h-5" />
                )}
            </button>
        </div>
    )
}
