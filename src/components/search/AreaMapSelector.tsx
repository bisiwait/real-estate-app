'use client'

import { useId, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { PATTAYA_MAP_AREAS, PATTAYA_MAP_LABEL_POS, type PattayaMapAreaKey } from '@/lib/search/pattayaAreaMap'

type PattayaAreaRow = { value: string; label: string }

export type AreaMapSelectorDict = {
    area_map_title: string
    area_map_hint: string
}

type AreaMapSelectorProps = {
    /** フィルター内で「MAPから選ぶ」後に true */
    visible: boolean
    areas: PattayaAreaRow[]
    region: string
    /** URL の `area`（マップ表示中も前回選択をハイライト） */
    selectedUrlArea: string
    onPickArea: (filterValue: string) => void
    className?: string
    dict: AreaMapSelectorDict
}

export default function AreaMapSelector({
    visible,
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

    if (!visible || region !== 'Pattaya') return null

    return (
        <div
            className={cn(
                'mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white shadow-inner',
                className
            )}
            role="region"
            aria-labelledby={`${baseId}-map-title`}
        >
            <div className="border-b border-slate-100 bg-white/80 px-3 py-2.5 sm:px-4">
                <h3 id={`${baseId}-map-title`} className="text-xs font-black tracking-tight text-navy-secondary">
                    {dict.area_map_title}
                </h3>
                <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-slate-500">{dict.area_map_hint}</p>
            </div>

            <div className="relative w-full overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 py-3 sm:px-3 sm:py-4">
                <div className="mx-auto w-full min-w-[300px] max-w-[440px]">
                    <svg
                        viewBox="0 0 420 400"
                        className="h-auto w-full max-h-[min(58vh,440px)] touch-manipulation select-none"
                        preserveAspectRatio="xMidYMid meet"
                        role="presentation"
                    >
                        <defs>
                            <linearGradient id={`${baseId}-sea`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.25" />
                            </linearGradient>
                            <linearGradient id={`${baseId}-shore`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.2" />
                            </linearGradient>
                            <filter id={`${baseId}-shadow`} x="-8%" y="-8%" width="116%" height="116%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.12" />
                            </filter>
                        </defs>

                        <rect x="0" y="0" width="118" height="400" fill={`url(#${baseId}-sea)`} rx="0" />
                        <path
                            d="M 118 0 L 118 400"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                            fill="none"
                        />
                        <path
                            d="M 118 0 Q 108 80 112 160 T 118 320 Q 120 360 118 400 L 0 400 L 0 0 Z"
                            fill={`url(#${baseId}-shore)`}
                            opacity="0.5"
                        />

                        {PATTAYA_MAP_AREAS.filter((a) => allowed.has(a.key)).map((a) => {
                            const pos = PATTAYA_MAP_LABEL_POS[a.key]
                            const selected = selectedUrlArea === a.filterValue
                            const hover = hoveredKey === a.key
                            const fill = selected ? a.fillSelected : hover ? a.fillHover : a.fill
                            const strokeW = selected ? 2.6 : hover ? 2 : 1.35
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
                                        stroke={a.stroke}
                                        strokeWidth={strokeW}
                                        strokeLinejoin="round"
                                        filter={`url(#${baseId}-shadow)`}
                                        className="transition-[fill,stroke-width] duration-200 ease-out"
                                    />
                                    <text
                                        textAnchor="middle"
                                        pointerEvents="none"
                                        style={{ fontFamily: 'inherit' }}
                                    >
                                        <tspan
                                            x={pos.x}
                                            y={pos.y}
                                            fill="#0f172a"
                                            fontSize="10.5"
                                            fontWeight="800"
                                        >
                                            {a.labelJa}
                                        </tspan>
                                        <tspan
                                            x={pos.x}
                                            y={pos.y + 13}
                                            fill="#475569"
                                            fontSize="9"
                                            fontWeight="600"
                                        >
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

export { PATTAYA_AREA_MAP_SELECT_VALUE } from '@/lib/search/pattayaAreaMap'
