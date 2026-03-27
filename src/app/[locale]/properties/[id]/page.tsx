import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createStaticClient } from '@/lib/supabase/static'
import PropertyDetailClient from './PropertyDetailClient'
import { getPublicSiteUrl } from '@/lib/site-url'

export const revalidate = 60

async function fetchProperty(id: string) {
    const supabase = createStaticClient()
    const { data } = await supabase
        .from('properties')
        .select('*, area:areas(name, slug, region:regions(name)), project:projects(*, developers(name)), developers(name)')
        .eq('id', id)
        .single()
    return data
}

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { locale, id } = await params

    try {
        const property = await fetchProperty(id)

        if (!property) {
            return {
                title: 'Property | Chonburi Home',
                description: 'Real estate listings in Pattaya & Sriracha.',
            }
        }

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
            const firstImage = property.images[0]
            let baseImageUrl = ''
            if (firstImage.startsWith('http')) {
                baseImageUrl = firstImage
            } else {
                const path = firstImage.startsWith('/') ? firstImage : `/${firstImage}`
                baseImageUrl = `${baseUrl}${path}`
            }

            // 1. Next.js の自動エスケープ (& -> &amp;) を避けるため、パラメータを1つ (?format=jpg) に絞る
            imageUrl = `${baseImageUrl}?format=jpg`
            ogImageType = 'image/jpeg'
            ogWidth = 1200
            ogHeight = 630
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
    const { id } = await params
    const property = await fetchProperty(id)

    if (!property) {
        notFound()
    }

    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center bg-slate-50">
                    <Loader2 className="h-10 w-10 animate-spin text-navy-primary" />
                </div>
            }
        >
            <PropertyDetailClient initialProperty={property} />
        </Suspense>
    )
}
