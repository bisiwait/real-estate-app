'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ListingTypeToggleProps {
    propertyId: string
    isForRent: boolean
    isForSale: boolean
}

export default function ListingTypeToggle({ propertyId, isForRent, isForSale }: ListingTypeToggleProps) {
    const [loading, setLoading] = useState<'rent' | 'sale' | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleToggle = async (type: 'is_for_rent' | 'is_for_sale', currentVal: boolean) => {
        // Prevent disabling both
        if (currentVal && ((type === 'is_for_rent' && !isForSale) || (type === 'is_for_sale' && !isForRent))) {
            alert('少なくとも1つの掲載タイプ（賃貸または売買）を有効にする必要があります。')
            return
        }

        setLoading(type === 'is_for_rent' ? 'rent' : 'sale')
        try {
            const { error } = await supabase
                .from('properties')
                .update({ [type]: !currentVal })
                .eq('id', propertyId)

            if (error) {
                alert('更新に失敗しました: ' + error.message)
            } else {
                router.refresh()
            }
        } catch (err: any) {
            alert('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
                onClick={() => handleToggle('is_for_rent', isForRent)}
                disabled={loading !== null}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all flex items-center space-x-1 ${isForRent ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-400 hover:text-navy-primary/60'}`}
            >
                {loading === 'rent' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>RENT</span>
            </button>
            <button
                onClick={() => handleToggle('is_for_sale', isForSale)}
                disabled={loading !== null}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all flex items-center space-x-1 ${isForSale ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-400 hover:text-navy-primary/60'}`}
            >
                {loading === 'sale' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>SALE</span>
            </button>
        </div>
    )
}
