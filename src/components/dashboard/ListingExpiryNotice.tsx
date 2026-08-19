'use client'

import { AlertTriangle } from 'lucide-react'
import BulkConfirmButton from '@/components/dashboard/BulkConfirmButton'

type ListingExpiryNoticeProps = {
    expiredPublishedIds: string[]
    dict: Record<string, string>
}

/** 公開中だが掲載期限切れの物件があるとき、サイト非表示であることを案内 */
export default function ListingExpiryNotice({
    expiredPublishedIds,
    dict,
}: ListingExpiryNoticeProps) {
    if (expiredPublishedIds.length === 0) return null

    return (
        <div
            role="status"
            className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
            <div className="flex min-w-0 items-start gap-3 text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0 space-y-1">
                    <p className="text-sm font-black leading-snug">{dict.listing_expiry_notice_title}</p>
                    <p className="text-xs font-medium leading-relaxed text-amber-800/90">
                        {dict.listing_expiry_notice_body.replace(
                            '{count}',
                            String(expiredPublishedIds.length)
                        )}
                    </p>
                </div>
            </div>
            <BulkConfirmButton
                dict={dict}
                propertyIds={expiredPublishedIds}
                className="w-full shrink-0 sm:w-auto"
            />
        </div>
    )
}
