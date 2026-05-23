'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type PattayaAreaMapOption = {
    label: string
    value: string
}

type PattayaAreaMapProps = {
    areas: PattayaAreaMapOption[]
    selectedArea: string
    onSelectArea: (value: string) => void
    className?: string
}

/** public/images/pattaya-area-map.png の実ピクセル寸法 */
const MAP_WIDTH = 1024
const MAP_HEIGHT = 986
const MAP_SRC = '/images/pattaya-area-map.png'

type RegionProfile = {
    value: string
    rgb: readonly [number, number, number]
    tolerance: number
}

/** 画像の塗り色に合わせたエリア判定（赤＝ナクルア・ウォンアマット） */
const REGION_PROFILES: RegionProfile[] = [
    {
        value: 'North Pattaya / Wongamat',
        rgb: [212, 88, 88],
        tolerance: 45,
    },
    {
        value: 'Central Pattaya',
        rgb: [240, 165, 75],
        tolerance: 40,
    },
    {
        value: 'South Pattaya',
        rgb: [240, 225, 90],
        tolerance: 35,
    },
    {
        value: 'Pratumnak',
        rgb: [90, 165, 90],
        tolerance: 45,
    },
    {
        value: 'Jomtien',
        rgb: [225, 150, 180],
        tolerance: 40,
    },
    {
        value: 'East Pattaya',
        rgb: [145, 106, 163],
        tolerance: 35,
    },
]

const HIGHLIGHT_RGBA: readonly [number, number, number, number] = [15, 23, 42, 95]
const HOVER_RGBA: readonly [number, number, number, number] = [15, 23, 42, 55]

function colorDistance(
    r: number,
    g: number,
    b: number,
    rgb: readonly [number, number, number]
): number {
    const [tr, tg, tb] = rgb
    return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
}

/** 海（薄いシアン）を選択対象から除外 */
function isSeaLike(r: number, g: number, b: number): boolean {
    return r > 130 && g > 180 && b > 210
}

function classifyPixel(r: number, g: number, b: number): string | null {
    if (isSeaLike(r, g, b)) return null

    let best: { value: string; distance: number } | null = null

    for (const profile of REGION_PROFILES) {
        const distance = colorDistance(r, g, b, profile.rgb)
        if (distance > profile.tolerance) continue
        if (!best || distance < best.distance) {
            best = { value: profile.value, distance }
        }
    }

    return best?.value ?? null
}

function regionIndexForValue(value: string): number {
    const index = REGION_PROFILES.findIndex((profile) => profile.value === value)
    return index >= 0 ? index + 1 : 0
}

function buildRegionMap(imageData: ImageData): Uint8Array {
    const regionMap = new Uint8Array(MAP_WIDTH * MAP_HEIGHT)
    const { data } = imageData

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const offset = (y * MAP_WIDTH + x) * 4
            const region = classifyPixel(data[offset], data[offset + 1], data[offset + 2])
            regionMap[y * MAP_WIDTH + x] = region ? regionIndexForValue(region) : 0
        }
    }

    return regionMap
}

function paintRegionOverlay(
    ctx: CanvasRenderingContext2D,
    regionMap: Uint8Array,
    regionIndex: number,
    rgba: readonly [number, number, number, number]
) {
    if (regionIndex <= 0) return

    const imageData = ctx.createImageData(MAP_WIDTH, MAP_HEIGHT)
    const { data } = imageData
    const [r, g, b, a] = rgba

    for (let i = 0; i < regionMap.length; i++) {
        if (regionMap[i] !== regionIndex) continue
        const offset = i * 4
        data[offset] = r
        data[offset + 1] = g
        data[offset + 2] = b
        data[offset + 3] = a
    }

    ctx.putImageData(imageData, 0, 0)
}

function clientToMapPixel(
    clientX: number,
    clientY: number,
    rect: DOMRect
): { x: number; y: number } | null {
    if (rect.width <= 0 || rect.height <= 0) return null

    const x = Math.floor(((clientX - rect.left) / rect.width) * MAP_WIDTH)
    const y = Math.floor(((clientY - rect.top) / rect.height) * MAP_HEIGHT)
    if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return null

    return { x, y }
}

export default function PattayaAreaMap({
    areas,
    selectedArea,
    onSelectArea,
    className,
}: PattayaAreaMapProps) {
    const overlayRef = useRef<HTMLCanvasElement>(null)
    const regionMapRef = useRef<Uint8Array | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [hoveredArea, setHoveredArea] = useState('')

    const labelByValue = Object.fromEntries(areas.map((area) => [area.value, area.label]))
    const selectedIndex = regionIndexForValue(selectedArea)
    const hoveredIndex = regionIndexForValue(hoveredArea)

    const redrawOverlay = useCallback(() => {
        const canvas = overlayRef.current
        const regionMap = regionMapRef.current
        if (!canvas || !regionMap) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
        paintRegionOverlay(ctx, regionMap, hoveredIndex, HOVER_RGBA)
        if (selectedIndex > 0) {
            paintRegionOverlay(ctx, regionMap, selectedIndex, HIGHLIGHT_RGBA)
        }
    }, [hoveredIndex, selectedIndex])

    useEffect(() => {
        let cancelled = false
        const image = new window.Image()
        image.src = MAP_SRC

        image.onload = () => {
            if (cancelled) return

            const canvas = document.createElement('canvas')
            canvas.width = MAP_WIDTH
            canvas.height = MAP_HEIGHT
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) return

            ctx.drawImage(image, 0, 0, MAP_WIDTH, MAP_HEIGHT)
            regionMapRef.current = buildRegionMap(ctx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT))
            setIsReady(true)
        }

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!isReady) return
        redrawOverlay()
    }, [isReady, redrawOverlay])

    const resolveAreaAt = useCallback((clientX: number, clientY: number): string | null => {
        const canvas = overlayRef.current
        const regionMap = regionMapRef.current
        if (!canvas || !regionMap) return null

        const pixel = clientToMapPixel(clientX, clientY, canvas.getBoundingClientRect())
        if (!pixel) return null

        const regionIndex = regionMap[pixel.y * MAP_WIDTH + pixel.x]
        if (regionIndex <= 0) return null

        return REGION_PROFILES[regionIndex - 1]?.value ?? null
    }, [])

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isReady) return
            const nextArea = resolveAreaAt(event.clientX, event.clientY) ?? ''
            setHoveredArea((current) => (current === nextArea ? current : nextArea))
        },
        [isReady, resolveAreaAt]
    )

    const handlePointerLeave = useCallback(() => {
        setHoveredArea('')
    }, [])

    const handleClick = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isReady) return
            const area = resolveAreaAt(event.clientX, event.clientY)
            if (!area) return
            onSelectArea(selectedArea === area ? '' : area)
        },
        [isReady, onSelectArea, resolveAreaAt, selectedArea]
    )

    const activeLabel = selectedArea
        ? labelByValue[selectedArea] ?? selectedArea
        : hoveredArea
          ? labelByValue[hoveredArea] ?? hoveredArea
          : ''

    return (
        <div
            className={cn(
                'relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
                className
            )}
        >
            <Image
                src={MAP_SRC}
                alt=""
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className="block h-auto w-full select-none"
                priority={false}
            />
            <canvas
                ref={overlayRef}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className={cn(
                    'absolute inset-0 h-full w-full touch-none',
                    isReady ? 'cursor-pointer' : 'cursor-wait'
                )}
                role="application"
                aria-label="Pattaya area map"
                aria-busy={!isReady}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onClick={handleClick}
            />
            {activeLabel ? (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-navy-primary shadow-sm">
                    {activeLabel}
                </div>
            ) : null}
        </div>
    )
}
