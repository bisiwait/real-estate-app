'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { normalizePropertyImageSrc, PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/property-image-url'

type PropertyThumbnailProps = {
    src?: unknown
    alt: string
    fill?: boolean
    width?: number
    height?: number
    sizes?: string
    priority?: boolean
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
    className,
}: PropertyThumbnailProps) {
    const initial = normalizePropertyImageSrc(src)
    const [imgSrc, setImgSrc] = useState(initial)

    useEffect(() => {
        setImgSrc(normalizePropertyImageSrc(src))
    }, [src])

    const common = {
        src: imgSrc,
        alt,
        className,
        sizes,
        priority,
        onError: () => setImgSrc(PROPERTY_PLACEHOLDER_IMAGE),
    } as const

    if (fill) {
        return <Image {...common} fill />
    }
    return <Image {...common} width={width ?? 400} height={height ?? 300} />
}
