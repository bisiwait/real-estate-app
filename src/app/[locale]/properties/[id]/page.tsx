import { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createStaticClient, createStaticClientForHostname } from '@/lib/supabase/static'
import PropertyDetailClient from './PropertyDetailClient'
import { getPublicSiteUrl } from '@/lib/site-url'
import { buildPropertyLineInquiryUrlServer } from '@/lib/line-oa-message-inquiry-url'
import { getPropertyOwnerLineInquiryRawInput } from '@/lib/property-owner-line-inquiry'
import { buildPropertyDetailAbsoluteUrl } from '@/lib/property-page-canonical-url'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { resolvePropertyImageUrl, PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/property-image-url'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

/** ISR: 1時間ごとに静的ページを再検証（Edge からキャッシュ HTML を返しやすくする） */
export const revalidate = 3600

/** ビルド時に未生成の ID へのアクセスも許可（初回オンデマンド生成後、revalidate に従って更新） */
export const dynamicParams = true

/**
 * 公開・承認済みの最新物件をビルド時プリレンダー（× layout の locale 組み合わせ）
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
    try {
        const supabase = createStaticClient()
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

function propertyDetailFallbackMetadata(
    locale: string,
    id: string,
    title: string,
    description: string
): Metadata {
    const baseUrl = getPublicSiteUrl()
    const pageUrl = `${baseUrl}/${locale}/properties/${id}`
    return {
        metadataBase: new URL(baseUrl),
        title,
        description,
        alternates: { canonical: pageUrl },
        openGraph: {
            title,
            description,
            url: pageUrl,
            siteName: 'Chonburi Home',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
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
        const fullTitle = `${title} | Chonburi Home`

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
                        alt: title,
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
