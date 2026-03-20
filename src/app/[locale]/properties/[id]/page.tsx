import { Metadata } from 'next'
import { createStaticClient } from '@/lib/supabase/static'
import PropertyDetailClient from './PropertyDetailClient'

const BASE_URL = 'https://real-estate-app-sigma-brown.vercel.app'

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
                title: 'Property | Chonburi Connect',
                description: 'Real estate listings in Pattaya & Sriracha.',
            }
        }

        const title = property.title_ja || property.title_en || property.title || 'Property'
        const description = property.description
            ? property.description.replace(/<[^>]+>/g, '').substring(0, 160)
            : 'Pattaya & Sriracha real estate listing on Chonburi Connect.'

        let imageUrl = `${BASE_URL}/og-default.png`
        if (property.images?.[0]) {
            const firstImage = property.images[0]
            if (firstImage.startsWith('http')) {
                imageUrl = firstImage
            } else {
                const path = firstImage.startsWith('/') ? firstImage : `/${firstImage}`
                imageUrl = `${BASE_URL}${path}`
            }
        }

        const pageUrl = `${BASE_URL}/${locale}/properties/${id}`

        return {
            title: `${title} | Chonburi Connect`,
            description,
            openGraph: {
                title: `${title} | Chonburi Connect`,
                description,
                url: pageUrl,
                siteName: 'Chonburi Connect',
                images: [
                    {
                        url: imageUrl,
                        secureUrl: imageUrl,
                        width: 1200,
                        height: 630,
                        alt: title,
                        type: imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
                    },
                ],
                locale: locale === 'jp' ? 'ja_JP' : locale === 'th' ? 'th_TH' : 'en_US',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} | Chonburi Connect`,
                description,
                images: [imageUrl],
            },
        }
    } catch (error) {
        console.error('[generateMetadata] error:', error)
        return {
            title: 'Property | Chonburi Connect',
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

    return <PropertyDetailClient initialProperty={property} />
}
