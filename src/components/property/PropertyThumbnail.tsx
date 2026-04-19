'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
    resolvePropertyImageUrl,
    PROPERTY_PLACEHOLDER_IMAGE,
    isSupabaseStorageHttpUrl,
} from '@/lib/property-image-url'

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

    /**
     * 一時復旧: Supabase は `/_next/image` 経由で 504 になる事例があるため直接取得（unoptimized）。
     * data/blob も Next 最適化は使わない。
     */
    const unoptimized =
        imgSrc.startsWith('data:') ||
        imgSrc.startsWith('blob:') ||
        isSupabaseStorageHttpUrl(imgSrc)

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
