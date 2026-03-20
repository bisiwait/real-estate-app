import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PropertyDetailClient from './PropertyDetailClient'

const BASE_URL = 'https://real-estate-app-sigma-brown.vercel.app'

export async function generateMetadata(
    { params }: { params: Promise<{ locale: string; id: string }> }
): Promise<Metadata> {
    const { locale, id } = await params

    try {
        const supabase = await createClient()
        const { data: property } = await supabase
            .from('properties')
            .select('title, title_ja, title_en, description, images')
            .eq('id', id)
            .single()

        if (!property) {
            return {
                title: 'Property | Chonburi Connect',
                description: 'Real estate listings in Pattaya & Sriracha.',
            }
        }

        const title = property.title_ja || property.title_en || property.title || 'Property'
        const description = property.description
            ? property.description.replace(/<[^>]+>/g, '').substring(0, 100)
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
                        width: 1200,
                        height: 630,
                        alt: title,
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
        console.error('Metadata generation error:', error)
        return {
            title: 'Property | Chonburi Connect',
            description: 'Real estate listings in Pattaya & Sriracha.',
        }
    }
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    // サーバーコンポーネントとして params を受け取り、クライアントコンポーネントに渡す
    return <PropertyDetailClient />;
}
