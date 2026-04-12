'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { resolvePropertyImageUrl, PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/property-image-url'

function isSupabaseStorageHttp(u: string): boolean {
    return /^https?:\/\//i.test(u) && /supabase\.(co|in)\//i.test(u)
}

type PropertyThumbnailProps = {
    src?: unknown
    alt: string
    fill?: boolean
    width?: number
    height?: number
    sizes?: string
    priority?: boolean
    /** Swiper 等「非表示スライド」では lazy が効かず読み込まれないことがあるため eager を指定可能 */
    loading?: 'eager' | 'lazy'
    className?: string
}

/**
 * 物件サムネイル。URL 不正・404・空のときはローカル SVG にフォールバック。
 */
export default function PropertyThumbnail({
    src,
    alt,
    fill,
    width,
    height,
    sizes,
    priority,
    loading,
    className,
}: PropertyThumbnailProps) {
    const initial = resolvePropertyImageUrl(src)
    const [imgSrc, setImgSrc] = useState(initial)

    useEffect(() => {
        setImgSrc(resolvePropertyImageUrl(src))
    }, [src])

    const unoptimized = isSupabaseStorageHttp(imgSrc)

    const common = {
        src: imgSrc,
        alt,
        className,
        sizes,
        priority,
        loading,
        unoptimized,
        onError: () => setImgSrc(PROPERTY_PLACEHOLDER_IMAGE),
    } as const

    if (fill) {
        return <Image {...common} fill />
    }
    return <Image {...common} width={width ?? 400} height={height ?? 300} />
}
