import { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createStaticServiceClient, createStaticServiceClientForHostname } from '@/lib/supabase/static'
import {
    enrichPropertyWithRelations,
    fetchAgentOtherPropertiesForDetail,
    fetchNearbyPropertiesForMap,
    fetchPublicListingOwnerProfile,
    fetchRelatedPropertiesForDetail,
} from '@/lib/supabase/fetch-property-detail'
import { resolveProjectCoords, toPropertyMapPoint } from '@/lib/property-map-coords'
import type { PropertyMapPoint } from '@/lib/property-map-coords'
import PropertyDetailClient from './PropertyDetailClient'
import { getPublicSiteUrl } from '@/lib/site-url'
import { buildPropertyDetailAbsoluteUrl } from '@/lib/property-page-canonical-url'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { resolvePropertyImageUrl, PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/property-image-url'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'
import { buildPropertyInquiryContactPayload } from '@/lib/property-inquiry-contact'

/** ISR: 1時間ごとに静的ページを再検証（Edge からキャッシュ HTML を返しやすくする） */
export const revalidate = 3600

/** ビルド時に未生成の ID へのアクセスも許可（初回オンデマンド生成後、revalidate に従って更新） */
export const dynamicParams = true

/**
 * 公開・承認済みの最新物件をビルド時プリレンダー（× layout の locale 組み合わせ）
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
    try {
        const supabase = createStaticServiceClient()
        const { data, error } = await supabase
            .from('properties')
            .select('id')
            .eq('status', 'published')
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(120)

        if (error) {
            console.error('[properties/[id] generateStaticParams]', error)
            return []
        }
        return (data ?? []).map((row: { id: string }) => ({ id: row.id }))
    } catch (e) {
        console.error('[properties/[id] generateStaticParams]', e)
        return []
    }
}

async function fetchProperty(id: string, hostname: string | null) {
    const supabase = createStaticServiceClientForHostname(hostname)
    const embedded = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name)), project:projects(*, developers(name)), developers(name)')
        .eq('id', id)
        .maybeSingle()

    if (embedded.data) {
        return enrichPropertyWithRelations(supabase, embedded.data as Record<string, unknown>)
    }

    if (embedded.error && embedded.error.code !== 'PGRST116') {
        console.error('[fetchProperty] embedded select failed, retrying minimal', embedded.error)
    }

    const minimal = await supabase.from('properties').select('*').eq('id', id).maybeSingle()
    if (!minimal.data) return null
    return enrichPropertyWithRelations(supabase, minimal.data as Record<string, unknown>)
}

function propertyDetailFallbackMetadata(
    locale: string,
    id: string,
    title: string,
    description: string
): Metadata {
    const baseUrl = getPublicSiteUrl()
    const pageUrl = `${baseUrl}/${locale}/properties/${id}`
    const safeTitle = (title || 'Property | Chonburi Home').trim() || 'Property | Chonburi Home'
    const safeDescription =
        (description || '').trim() || 'Real estate listings in Pattaya & Sriracha.'
    return {
        metadataBase: new URL(baseUrl),
        title: safeTitle,
        description: safeDescription,
        alternates: { canonical: pageUrl },
        openGraph: {
            title: safeTitle,
            description: safeDescription,
            url: pageUrl,
            siteName: 'Chonburi Home',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: safeTitle,
            description: safeDescription,
        },
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { locale, id } = await params
    const hdrs = await headers()
    const hostname = hostHeaderFromHeaders(hdrs)

    try {
        const property = await fetchProperty(id, hostname)

        if (!property) {
            return propertyDetailFallbackMetadata(
                locale,
                id,
                'Property | Chonburi Home',
                'Real estate listings in Pattaya & Sriracha.'
            )
        }

        const { url: supabasePublicUrl } = getSupabasePublicConfig(hostname)

        const rawTitle = (property.title_ja || property.title_en || property.title || 'Property').trim() || 'Property'
        const strippedDesc = property.description
            ? property.description.replace(/<[^>]+>/g, '').trim()
            : ''
        const defaultDesc = 'Pattaya & Sriracha real estate listing on Chonburi Home.'
        const description = strippedDesc ? strippedDesc.substring(0, 160) : defaultDesc

        const baseUrl = getPublicSiteUrl()
        let imageUrl = `${baseUrl}/logo_800.svg`
        let ogImageType: 'image/jpeg' | 'image/svg+xml' = 'image/svg+xml'
        let ogWidth = 800
        let ogHeight = 400
        if (property.images?.[0]) {
            const resolved = resolvePropertyImageUrl(property.images[0], supabasePublicUrl)
            if (resolved !== PROPERTY_PLACEHOLDER_IMAGE && /^https?:\/\//i.test(resolved)) {
                // Supabase Storage の変換は searchParams で統一（既存クエリがあれば上書き／マージ）
                try {
                    const u = new URL(resolved)
                    u.searchParams.set('format', 'jpg')
                    imageUrl = u.toString()
                } catch {
                    imageUrl = `${resolved}${resolved.includes('?') ? '&' : '?'}format=jpg`
                }
                ogImageType = 'image/jpeg'
                ogWidth = 1200
                ogHeight = 630
            }
        }

        const pageUrl = `${baseUrl}/${locale}/properties/${id}`
        const fullTitle = `${rawTitle} | Chonburi Home`

        return {
            metadataBase: new URL(baseUrl),
            title: fullTitle,
            description,
            alternates: { canonical: pageUrl },
            openGraph: {
                title: fullTitle,
                description,
                url: pageUrl,
                siteName: 'Chonburi Home',
                images: [
                    {
                        url: imageUrl,
                        secureUrl: imageUrl,
                        width: ogWidth,
                        height: ogHeight,
                        alt: rawTitle,
                        type: ogImageType,
                    },
                ],
                locale: locale === 'jp' ? 'ja_JP' : locale === 'th' ? 'th_TH' : 'en_US',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: fullTitle,
                description,
                images: [imageUrl],
            },
        }
    } catch (error) {
        console.error('[generateMetadata] error:', error)
        return propertyDetailFallbackMetadata(
            locale,
            id,
            'Property | Chonburi Home',
            'Real estate listings in Pattaya & Sriracha.'
        )
    }
}

export default async function Page({
    params,
}: {
    params: Promise<{ locale: string; id: string }>
}) {
    const { id, locale } = await params
    const hdrs = await headers()
    const hostname = hostHeaderFromHeaders(hdrs)
    const property = await fetchProperty(id, hostname)

    if (!property) {
        notFound()
    }

    const { url: supabasePublicUrl } = getSupabasePublicConfig(hostname)
    const imagesRaw = property.images
    const propertyForClient = {
        ...property,
        images: Array.isArray(imagesRaw)
            ? imagesRaw.map((img: unknown) => resolvePropertyImageUrl(img, supabasePublicUrl))
            : imagesRaw,
    }

    const propertyDetailPageUrl = buildPropertyDetailAbsoluteUrl(hdrs, locale, id)

    const supabase = createStaticServiceClientForHostname(hostname)

    let listingOwner = null as Awaited<ReturnType<typeof fetchPublicListingOwnerProfile>>
    let officialLineAddFriendUrl = ''
    let initialListingOwnerPhone: string | undefined
    let initialListingOwnerShowWhatsapp = true

    const inquiryContact = await buildPropertyInquiryContactPayload(
        supabase,
        propertyForClient as Record<string, unknown>,
        locale,
        hostname,
        propertyDetailPageUrl
    )
    listingOwner = inquiryContact.listingOwner
    officialLineAddFriendUrl = inquiryContact.officialLineAddFriendUrl
    initialListingOwnerPhone = inquiryContact.listingPhoneForTel
    initialListingOwnerShowWhatsapp = listingOwner?.show_whatsapp_in_inquiry !== false

    const projectForMap = propertyForClient.project as
        | { latitude?: unknown; longitude?: unknown; google_maps_share_url?: unknown; google_place_id?: unknown }
        | null
    let centerCoords: { lat: number; lng: number } | null = null
    let initialMapCenter: PropertyMapPoint | null = null
    let nearbyMapProperties: PropertyMapPoint[] = []

    try {
        centerCoords = resolveProjectCoords(projectForMap)
        initialMapCenter = centerCoords
            ? toPropertyMapPoint(propertyForClient as Record<string, unknown>, locale, centerCoords)
            : null
    } catch (error) {
        console.warn('[properties/[id]] map center resolve failed', error)
    }

    const [relatedProperties, agentOtherProperties] = await Promise.all([
        fetchRelatedPropertiesForDetail(
            supabase,
            id,
            propertyForClient.building_name as string | null | undefined,
            (propertyForClient.project as { name?: string } | null)?.name ??
                (propertyForClient.project_name as string | null | undefined)
        ),
        propertyForClient.user_id
            ? fetchAgentOtherPropertiesForDetail(
                  supabase,
                  propertyForClient.user_id as string,
                  id
              )
            : Promise.resolve([]),
    ])

    if (centerCoords) {
        try {
            nearbyMapProperties = await fetchNearbyPropertiesForMap(
                supabase,
                id,
                centerCoords.lat,
                centerCoords.lng
            )
        } catch (error) {
            console.warn('[properties/[id]] nearby map fetch failed', error)
        }
    }

    const mapPropertyImages = (rows: Record<string, unknown>[]) =>
        rows.map((row) => {
            const imagesRaw = row.images
            return {
                ...row,
                images: Array.isArray(imagesRaw)
                    ? imagesRaw.map((img: unknown) => resolvePropertyImageUrl(img, supabasePublicUrl))
                    : imagesRaw,
            }
        })

    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
                    <Loader2 className="h-10 w-10 animate-spin text-navy-primary" />
                </div>
            }
        >
            <PropertyDetailClient
                initialProperty={propertyForClient}
                initialListingOwner={listingOwner}
                initialRelatedProperties={mapPropertyImages(relatedProperties as Record<string, unknown>[])}
                initialAgentOtherProperties={mapPropertyImages(agentOtherProperties as Record<string, unknown>[])}
                initialNearbyMapProperties={nearbyMapProperties}
                initialMapCenter={initialMapCenter}
                officialLineAddFriendUrl={officialLineAddFriendUrl}
                propertyDetailPageUrl={propertyDetailPageUrl}
                initialListingOwnerPhone={initialListingOwnerPhone}
                initialListingOwnerShowWhatsapp={initialListingOwnerShowWhatsapp}
                initialListingOwnerShowPhone={listingOwner?.show_phone_in_inquiry !== false}
            />
        </Suspense>
    )
}
