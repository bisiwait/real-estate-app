'use client'

import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
    PATTAYA_MAP_AREAS,
    PATTAYA_MAP_LABEL_POS,
    PATTAYA_MAP_STROKE,
    type PattayaMapAreaKey,
} from '@/lib/search/pattayaAreaMap'

type PattayaAreaRow = { value: string; label: string }

export type AreaMapSelectorDict = {
    area_map_title: string
    area_map_hint: string
}

type AreaMapSelectorProps = {
    open: boolean
    areas: PattayaAreaRow[]
    region: string
    selectedUrlArea: string
    onPickArea: (filterValue: string) => void
    className?: string
    dict: AreaMapSelectorDict
}

export default function AreaMapSelector({
    open,
    areas,
    region,
    selectedUrlArea,
    onPickArea,
    className,
    dict,
}: AreaMapSelectorProps) {
    const baseId = useId()
    const [hoveredKey, setHoveredKey] = useState<PattayaMapAreaKey | null>(null)

    const allowed = useMemo(() => {
        const s = new Set(areas.map((a) => a.value))
        return new Set(PATTAYA_MAP_AREAS.filter((a) => s.has(a.filterValue)).map((a) => a.key))
    }, [areas])

    if (!open || region !== 'Pattaya') return null

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200',
                className
            )}
            role="region"
            aria-labelledby={`${baseId}-map-title`}
        >
            <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
                <h3 id={`${baseId}-map-title`} className="text-xs font-semibold tracking-tight text-slate-700">
                    {dict.area_map_title}
                </h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{dict.area_map_hint}</p>
            </div>

            <div className="flex w-full max-w-full items-center justify-center bg-slate-50/60 p-3 sm:p-4">
                <div className="relative h-full w-full max-h-72 max-w-lg">
                    <svg
                        viewBox="0 0 400 320"
                        className="h-auto max-h-72 w-full object-contain touch-manipulation select-none"
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-labelledby={`${baseId}-svg-title`}
                    >
                        <title id={`${baseId}-svg-title`}>{dict.area_map_title}</title>
                        <defs>
                            <linearGradient id={`${baseId}-sea`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#f8fafc" />
                                <stop offset="100%" stopColor="#e0f2fe" />
                            </linearGradient>
                        </defs>

                        <rect x="0" y="0" width="92" height="320" fill={`url(#${baseId}-sea)`} />
                        <path
                            d="M 92 0 L 92 320"
                            stroke={PATTAYA_MAP_STROKE.default}
                            strokeWidth="1"
                            fill="none"
                        />

                        {PATTAYA_MAP_AREAS.filter((a) => allowed.has(a.key)).map((a) => {
                            const pos = PATTAYA_MAP_LABEL_POS[a.key]
                            const selected = selectedUrlArea === a.filterValue
                            const hover = hoveredKey === a.key
                            const fill = selected ? a.fillSelected : hover ? a.fillHover : a.fill
                            const stroke = selected
                                ? PATTAYA_MAP_STROKE.selected
                                : hover
                                  ? PATTAYA_MAP_STROKE.hover
                                  : PATTAYA_MAP_STROKE.default
                            const strokeW = selected ? 1.35 : hover ? 1.2 : 1
                            return (
                                <g
                                    key={a.key}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${a.labelJa} / ${a.labelEn}`}
                                    className="cursor-pointer outline-none"
                                    onMouseEnter={() => setHoveredKey(a.key)}
                                    onMouseLeave={() => setHoveredKey(null)}
                                    onFocus={() => setHoveredKey(a.key)}
                                    onBlur={() => setHoveredKey(null)}
                                    onClick={() => onPickArea(a.filterValue)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            onPickArea(a.filterValue)
                                        }
                                    }}
                                >
                                    <path
                                        d={a.path}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={strokeW}
                                        strokeLinejoin="round"
                                        className="transition-[fill,stroke,stroke-width] duration-200 ease-out"
                                    />
                                    <text
                                        textAnchor="middle"
                                        pointerEvents="none"
                                        fill="#475569"
                                        style={{ fontFamily: 'inherit' }}
                                    >
                                        <tspan x={pos.x} y={pos.y} fontSize="10" fontWeight="600">
                                            {a.labelJa}
                                        </tspan>
                                        <tspan x={pos.x} y={pos.y + 12} fontSize="9" fontWeight="500" opacity="0.92">
                                            {a.labelEn}
                                        </tspan>
                                    </text>
                                </g>
                            )
                        })}
                    </svg>
                </div>
            </div>
        </div>
    )
}
