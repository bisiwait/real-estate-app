import { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createStaticClientForHostname } from '@/lib/supabase/static'
import PropertyDetailClient from './PropertyDetailClient'
import { getPublicSiteUrl } from '@/lib/site-url'
import { buildPropertyLineInquiryUrlServer } from '@/lib/line-oa-message-inquiry-url'
import { getPropertyOwnerLineInquiryRawInput } from '@/lib/property-owner-line-inquiry'
import { buildPropertyDetailAbsoluteUrl } from '@/lib/property-page-canonical-url'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { resolvePropertyImageUrl, PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/property-image-url'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

export const revalidate = 60

async function fetchProperty(id: string, hostname: string | null) {
    const supabase = createStaticClientForHostname(hostname)
    const embedded = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name)), project:projects(*, developers(name)), developers(name)')
        .eq('id', id)
        .maybeSingle()

    if (embedded.data) return embedded.data

    if (embedded.error && embedded.error.code !== 'PGRST116') {
        console.error('[fetchProperty] embedded select failed, retrying minimal', embedded.error)
    }

    const minimal = await supabase.from('properties').select('*').eq('id', id).maybeSingle()
    return minimal.data ?? null
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
            return {
                title: 'Property | Chonburi Home',
                description: 'Real estate listings in Pattaya & Sriracha.',
            }
        }

        const { url: supabasePublicUrl } = getSupabasePublicConfig(hostname)

        const title = property.title_ja || property.title_en || property.title || 'Property'
        const description = property.description
            ? property.description.replace(/<[^>]+>/g, '').substring(0, 160)
            : 'Pattaya & Sriracha real estate listing on Chonburi Home.'

        const baseUrl = getPublicSiteUrl()
        let imageUrl = `${baseUrl}/logo_800.svg`
        let ogImageType: 'image/jpeg' | 'image/svg+xml' = 'image/svg+xml'
        let ogWidth = 800
        let ogHeight = 400
        if (property.images?.[0]) {
            const resolved = resolvePropertyImageUrl(property.images[0], supabasePublicUrl)
            if (resolved !== PROPERTY_PLACEHOLDER_IMAGE && /^https?:\/\//i.test(resolved)) {
                // 1. Next.js の自動エスケープ (& -> &amp;) を避けるため、パラメータを1つ (?format=jpg) に絞る
                imageUrl = `${resolved}?format=jpg`
                ogImageType = 'image/jpeg'
                ogWidth = 1200
                ogHeight = 630
            }
        }

        const pageUrl = `${baseUrl}/${locale}/properties/${id}`

        return {
            title: `${title} | Chonburi Home`,
            description,
            openGraph: {
                title: `${title} | Chonburi Home`,
                description,
                url: pageUrl,
                siteName: 'Chonburi Home',
                images: [
                    {
                        url: imageUrl,
                        secureUrl: imageUrl,
                        width: ogWidth,
                        height: ogHeight,
                        alt: title,
                        type: ogImageType,
                    },
                ],
                locale: locale === 'jp' ? 'ja_JP' : locale === 'th' ? 'th_TH' : 'en_US',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} | Chonburi Home`,
                description,
                images: [imageUrl],
            },
        }
    } catch (error) {
        console.error('[generateMetadata] error:', error)
        return {
            title: 'Property | Chonburi Home',
            description: 'Real estate listings in Pattaya & Sriracha.',
        }
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

    /** サイト既定の公式 LINE には誘導しない。オーナーが line_basic_id / line_id を設定している場合のみ組み立てる */
    let officialLineAddFriendUrl = ''
    if (propertyForClient.user_id) {
        const supabase = createStaticClientForHostname(hostname)
        const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('line_basic_id, line_id, show_line_in_inquiry')
            .eq('id', propertyForClient.user_id as string)
            .maybeSingle()
        const raw = getPropertyOwnerLineInquiryRawInput(ownerProfile)
        if (raw) {
            officialLineAddFriendUrl = await buildPropertyLineInquiryUrlServer(
                raw,
                propertyForClient,
                locale,
                hostname,
                propertyDetailPageUrl
            )
        }
    }

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
                officialLineAddFriendUrl={officialLineAddFriendUrl}
                propertyDetailPageUrl={propertyDetailPageUrl}
            />
        </Suspense>
    )
}
