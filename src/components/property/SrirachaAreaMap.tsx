'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SrirachaAreaMapOption = {
    label: string
    value: string
}

type SrirachaAreaMapProps = {
    areas: SrirachaAreaMapOption[]
    selectedArea: string
    onSelectArea: (value: string) => void
    className?: string
}

/** public/images/sriracha-area-map.png の実ピクセル寸法 */
const MAP_WIDTH = 1000
const MAP_HEIGHT = 1000
const MAP_SRC = '/images/sriracha-area-map.png'

type RegionProfile = {
    value: string
    rgb: readonly [number, number, number]
    tolerance: number
}

const CENTRAL_VALUE = 'シラチャ中心部'

/** シラチャ中心部の濃い青オーバーレイ範囲（%・780×752 相当の実測） */
const CENTRAL_LAND_POLYGON: readonly [number, number][] = [
    [30, 25.5],
    [37.5, 26],
    [37.5, 38],
    [36, 42.5],
    [32, 43],
    [30, 40],
    [29.5, 32],
]

/** 塗り色で判定するエリア（中心部以外・境界の誤判定を減らす優先順） */
const REGION_PROFILES: RegionProfile[] = [
    { value: 'シラチャ南部', rgb: [231, 25, 31], tolerance: 50 },
    { value: 'シラチャ北部', rgb: [255, 166, 41], tolerance: 50 },
    { value: 'イオン周辺', rgb: [20, 174, 92], tolerance: 50 },
    { value: 'Jパーク周辺', rgb: [213, 88, 203], tolerance: 50 },
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

/** 海・沿岸の薄いシアン（濃い青オーバーレイと誤判定しない） */
function isSeaLikeCyan(r: number, g: number, b: number): boolean {
    return r > 110 && g > 185 && b > 195
}

function isCentralOverlayColor(r: number, g: number, b: number): boolean {
    if (isSeaLikeCyan(r, g, b)) return false
    return b > 150 && b > r + 40 && g > 120 && g < 220 && r < 90
}

function isCentralLand(xPercent: number, yPercent: number, r: number, g: number, b: number): boolean {
    if (!pointInPolygon(xPercent, yPercent, CENTRAL_LAND_POLYGON)) return false
    return isCentralOverlayColor(r, g, b)
}

function classifyPixel(r: number, g: number, b: number, x: number, y: number): string | null {
    const xPercent = (x / MAP_WIDTH) * 100
    const yPercent = (y / MAP_HEIGHT) * 100

    for (const profile of REGION_PROFILES) {
        if (colorDistance(r, g, b, profile.rgb) <= profile.tolerance) {
            return profile.value
        }
    }

    if (isCentralLand(xPercent, yPercent, r, g, b)) return CENTRAL_VALUE
    return null
}

function regionIndexForValue(value: string): number {
    if (value === CENTRAL_VALUE) return REGION_PROFILES.length + 1
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

export default function SrirachaAreaMap({
    areas,
    selectedArea,
    onSelectArea,
    className,
}: SrirachaAreaMapProps) {
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

        return regionIndex === REGION_PROFILES.length + 1
            ? CENTRAL_VALUE
            : REGION_PROFILES[regionIndex - 1]?.value ?? null
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
                aria-label="Sriracha area map"
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
