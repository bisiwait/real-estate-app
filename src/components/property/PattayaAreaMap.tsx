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
const MAP_WIDTH = 780
const MAP_HEIGHT = 752
const MAP_SRC = '/images/pattaya-area-map.png'

type RegionProfile = {
    value: string
    rgb: readonly [number, number, number]
    tolerance: number
}

/** 画像の塗り色に合わせたエリア判定 */
const REGION_PROFILES: RegionProfile[] = [
    {
        value: 'Central Pattaya',
        rgb: [238, 162, 68],
        tolerance: 32,
    },
    {
        value: 'Pratumnak',
        rgb: [96, 169, 96],
        tolerance: 42,
    },
    {
        value: 'South Pattaya',
        rgb: [241, 231, 82],
        tolerance: 28,
    },
    {
        value: 'Jomtien',
        rgb: [231, 156, 187],
        tolerance: 34,
    },
    {
        value: 'East Pattaya',
        rgb: [145, 106, 163],
        tolerance: 24,
    },
]

const NAKLUA_VALUE = 'North Pattaya / Wongamat'
const NAKLUA_RGB: readonly [number, number, number] = [148, 201, 233]
const NAKLUA_TOLERANCE = 18

/** ナクルア・ウォンアマットの陸地（% は幅・高さに対する比率） */
const NAKLUA_LAND_POLYGON: readonly [number, number][] = [
    [17, 3.8],
    [26, 3.2],
    [39, 3.5],
    [51, 4.2],
    [61.5, 5.2],
    [62.5, 11],
    [61, 18.5],
    [50, 19.8],
    [30, 20.2],
    [14, 18.5],
    [11, 14],
    [13, 8],
]

/** 左側の開放水域。ナクルアと同色の海を選択対象から除外する */
const OPEN_WATER_COASTLINE: readonly [number, number][] = [
    [3, 18],
    [8, 13],
    [14, 11],
    [20, 10],
    [25, 9],
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

function pointInPolygon(x: number, y: number, polygon: readonly [number, number][]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        const intersects =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
        if (intersects) inside = !inside
    }
    return inside
}

function coastlineXAtY(yPercent: number): number {
    for (let i = 0; i < OPEN_WATER_COASTLINE.length - 1; i++) {
        const [y1, x1] = OPEN_WATER_COASTLINE[i]
        const [y2, x2] = OPEN_WATER_COASTLINE[i + 1]
        if (yPercent < y1 || yPercent > y2) continue
        const t = (yPercent - y1) / (y2 - y1 + Number.EPSILON)
        return x1 + (x2 - x1) * t
    }
    return OPEN_WATER_COASTLINE[OPEN_WATER_COASTLINE.length - 1]?.[1] ?? 0
}

function isOpenWater(xPercent: number, yPercent: number, r: number, g: number, b: number): boolean {
    if (colorDistance(r, g, b, NAKLUA_RGB) > NAKLUA_TOLERANCE) return false
    return xPercent < coastlineXAtY(yPercent)
}

function isNakluaLand(xPercent: number, yPercent: number, r: number, g: number, b: number): boolean {
    if (isOpenWater(xPercent, yPercent, r, g, b)) return false
    if (!pointInPolygon(xPercent, yPercent, NAKLUA_LAND_POLYGON)) return false
    return colorDistance(r, g, b, NAKLUA_RGB) <= NAKLUA_TOLERANCE
}

function classifyPixel(r: number, g: number, b: number, x: number, y: number): string | null {
    const xPercent = (x / MAP_WIDTH) * 100
    const yPercent = (y / MAP_HEIGHT) * 100
    let best: { value: string; distance: number } | null = null

    for (const profile of REGION_PROFILES) {
        const distance = colorDistance(r, g, b, profile.rgb)
        if (distance > profile.tolerance) continue
        if (!best || distance < best.distance) {
            best = { value: profile.value, distance }
        }
    }

    if (best) return best.value
    if (isNakluaLand(xPercent, yPercent, r, g, b)) return NAKLUA_VALUE
    return null
}

function regionIndexForValue(value: string): number {
    if (value === NAKLUA_VALUE) return REGION_PROFILES.length + 1
    const index = REGION_PROFILES.findIndex((profile) => profile.value === value)
    return index >= 0 ? index + 1 : 0
}

function buildRegionMap(imageData: ImageData): Uint8Array {
    const regionMap = new Uint8Array(MAP_WIDTH * MAP_HEIGHT)
    const { data } = imageData

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const offset = (y * MAP_WIDTH + x) * 4
            const region = classifyPixel(data[offset], data[offset + 1], data[offset + 2], x, y)
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
        if (selectedIndex > 0 && selectedIndex !== hoveredIndex) {
            paintRegionOverlay(ctx, regionMap, selectedIndex, HIGHLIGHT_RGBA)
        } else if (selectedIndex > 0) {
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

        return regionIndex > 0
            ? regionIndex === REGION_PROFILES.length + 1
                ? NAKLUA_VALUE
                : REGION_PROFILES[regionIndex - 1]?.value ?? null
            : null
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
