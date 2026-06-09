import type { SupabaseClient } from '@supabase/supabase-js'
import {
    fetchPublicListingOwnerProfile,
    type PublicListingOwnerProfile,
} from '@/lib/supabase/fetch-property-detail'
import { getPropertyOwnerLineInquiryRawInput } from '@/lib/property-owner-line-inquiry'
import {
    buildPropertyLineInquiryUrlServer,
    resolveLinePropertyTitle,
} from '@/lib/line-oa-message-inquiry-url'
import { buildWhatsAppWaMeUrl } from '@/lib/whatsapp-wa-me-url'

export type PropertyInquiryContactPayload = {
    listingPhoneForTel?: string
    whatsAppInquiryUrl?: string
    officialLineAddFriendUrl: string
    listingOwner: PublicListingOwnerProfile | null
}

const DEFAULT_WHATSAPP_TEMPLATE =
    '物件について問い合わせます。\n{propertyName}\n{propertyUrl}'

/** 掲載者プロフィールから物件ページの問い合わせチャネル（電話/LINE/WhatsApp）を組み立てる */
export async function buildPropertyInquiryContactPayload(
    supabase: SupabaseClient,
    property: Record<string, unknown>,
    locale: string,
    hostname: string | null | undefined,
    propertyDetailPageUrl: string,
    whatsappTemplate = DEFAULT_WHATSAPP_TEMPLATE
): Promise<PropertyInquiryContactPayload> {
    const userId = typeof property.user_id === 'string' ? property.user_id : null
    let listingOwner: PublicListingOwnerProfile | null = null
    let officialLineAddFriendUrl = ''
    let listingPhoneForTel: string | undefined
    let whatsAppInquiryUrl: string | undefined

    if (userId) {
        listingOwner = await fetchPublicListingOwnerProfile(supabase, userId)

        const phoneTrimmed =
            typeof listingOwner?.phone === 'string' && listingOwner.phone.trim().length > 0
                ? listingOwner.phone.trim()
                : undefined

        if (phoneTrimmed && listingOwner?.show_phone_in_inquiry !== false) {
            listingPhoneForTel = phoneTrimmed
        }

        if (phoneTrimmed && listingOwner?.show_whatsapp_in_inquiry !== false) {
            const displayTitle = resolveLinePropertyTitle(property, locale)
            const msg = whatsappTemplate
                .replace(/\{propertyName\}/g, displayTitle.trim())
                .replace(/\{propertyUrl\}/g, propertyDetailPageUrl.trim())
            whatsAppInquiryUrl = buildWhatsAppWaMeUrl(phoneTrimmed, msg) ?? undefined
        }

        const raw = getPropertyOwnerLineInquiryRawInput(listingOwner)
        if (raw) {
            officialLineAddFriendUrl = await buildPropertyLineInquiryUrlServer(
                raw,
                property,
                locale,
                hostname,
                propertyDetailPageUrl
            )
        }
    }

    return {
        listingPhoneForTel,
        whatsAppInquiryUrl,
        officialLineAddFriendUrl,
        listingOwner,
    }
}
