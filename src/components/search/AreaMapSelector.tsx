'use client'

import { useCallback, useId, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

/** DB の `areas.name` と一覧 URL の `area=` に一致させる（PropertiesClient の AREAS_BY_CITY と同順） */
export const PATTAYA_AREA_MAP_ORDER = [
    { key: 'naklua', filterValue: 'North Pattaya / Wongamat' },
    { key: 'central', filterValue: 'Central Pattaya' },
    { key: 'south', filterValue: 'South Pattaya' },
    { key: 'pratumnak', filterValue: 'Pratumnak' },
    { key: 'jomtien', filterValue: 'Jomtien' },
    { key: 'east', filterValue: 'East Pattaya' },
] as const

type PattayaAreaRow = { value: string; label: string }

type AreaMapSelectorProps = {
    /** パタヤのエリア一覧（value は DB 名・URL と一致） */
    areas: PattayaAreaRow[]
    /** `searchParams` の `region`。`Pattaya` のときだけ表示 */
    region: string
    className?: string
    dict: {
        area_map_title: string
        area_map_hint: string
    }
}

/**
 * viewBox 内の座標で海岸（左）から陸地エリアを表現。
 * クリック / キーボードで `?area=` を更新（同一エリアの再クリックで解除）。
 */
function areaPathD(key: (typeof PATTAYA_AREA_MAP_ORDER)[number]['key']): string {
    switch (key) {
        case 'naklua':
            return 'M 92 6 L 268 6 L 262 70 L 92 76 Z'
        case 'central':
            return 'M 92 76 L 262 70 L 256 138 L 92 146 Z'
        case 'south':
            return 'M 92 146 L 256 138 L 250 208 L 92 216 Z'
        case 'pratumnak':
            return 'M 92 216 L 250 208 L 254 268 L 92 276 Z'
        case 'jomtien':
            return 'M 92 276 L 254 268 L 260 334 L 92 338 Z'
        case 'east':
            return 'M 264 72 L 374 72 L 374 300 L 264 288 Z'
        default:
            return ''
    }
}

export default function AreaMapSelector({ areas, region, className, dict }: AreaMapSelectorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const baseId = useId()
    const [hoveredValue, setHoveredValue] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const labelByValue = useMemo(() => {
        const m = new Map<string, string>()
        for (const a of areas) m.set(a.value, a.label)
        return m
    }, [areas])

    const rows = useMemo(() => {
        return PATTAYA_AREA_MAP_ORDER.map((def) => ({
            ...def,
            label: labelByValue.get(def.filterValue) ?? def.filterValue,
        })).filter((r) => labelByValue.has(r.filterValue))
    }, [labelByValue])

    const selectedArea = searchParams.get('area') ?? ''

    const applyAreaToUrl = useCallback(
        (nextArea: string) => {
            const p = new URLSearchParams(searchParams.toString())
            const current = p.get('area') ?? ''
            if (nextArea === current) {
                p.delete('area')
            } else {
                p.set('area', nextArea)
            }
            p.set('region', 'Pattaya')
            const qs = p.toString()
            startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
            })
        },
        [pathname, router, searchParams, startTransition]
    )

    const pathFill = (value: string) => {
        const on = selectedArea === value
        const hover = hoveredValue === value
        if (on) return 'rgba(30, 58, 138, 0.55)'
        if (hover) return 'rgba(30, 58, 138, 0.28)'
        return 'rgba(148, 163, 184, 0.35)'
    }

    const pathStroke = (value: string) => {
        const on = selectedArea === value
        const hover = hoveredValue === value
        if (on || hover) return 'rgb(30, 58, 138)'
        return 'rgb(203, 213, 225)'
    }

    if (region !== 'Pattaya' || rows.length === 0) return null

    return (
        <section
            className={cn(
                'rounded-3xl border border-slate-200/80 bg-white p-4 shadow-md shadow-slate-200/40 sm:p-5',
                className
            )}
            aria-labelledby={`${baseId}-title`}
        >
            <div className="mb-3">
                <h2 id={`${baseId}-title`} className="text-sm font-black tracking-tight text-navy-secondary">
                    {dict.area_map_title}
                </h2>
                <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500">{dict.area_map_hint}</p>
            </div>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch">
                <div className="relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-slate-100 bg-gradient-to-b from-sky-50/90 to-slate-50 px-2 py-3 sm:px-3">
                    <div className="mx-auto w-full min-w-[280px] max-w-[420px]">
                        <svg
                            viewBox="0 0 380 340"
                            className="h-auto w-full max-h-[min(52vh,400px)] touch-manipulation select-none"
                            preserveAspectRatio="xMidYMid meet"
                            role="img"
                            aria-label={dict.area_map_title}
                        >
                            <title>{dict.area_map_title}</title>
                            {/* 海 */}
                            <defs>
                                <linearGradient id={`${baseId}-sea`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.95" />
                                    <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.5" />
                                </linearGradient>
                                <linearGradient id={`${baseId}-sand`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fefce8" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.15" />
                                </linearGradient>
                            </defs>
                            <rect x="0" y="0" width="92" height="340" fill={`url(#${baseId}-sea)`} />
                            <path
                                d="M 92 0 L 92 340"
                                fill="none"
                                stroke="#7dd3fc"
                                strokeWidth="2"
                                strokeDasharray="4 6"
                                opacity="0.9"
                            />
                            <rect x="92" y="0" width="288" height="340" fill={`url(#${baseId}-sand)`} opacity="0.6" />

                            {rows.map(({ key, filterValue }) => (
                                <path
                                    key={key}
                                    d={areaPathD(key)}
                                    fill={pathFill(filterValue)}
                                    stroke={pathStroke(filterValue)}
                                    strokeWidth={selectedArea === filterValue ? 2.2 : 1.5}
                                    className="cursor-pointer outline-none transition-[fill,stroke] duration-150"
                                    tabIndex={0}
                                    role="button"
                                    aria-pressed={selectedArea === filterValue}
                                    aria-label={labelByValue.get(filterValue) ?? filterValue}
                                    onMouseEnter={() => setHoveredValue(filterValue)}
                                    onMouseLeave={() => setHoveredValue(null)}
                                    onFocus={() => setHoveredValue(filterValue)}
                                    onBlur={() => setHoveredValue(null)}
                                    onClick={() => applyAreaToUrl(filterValue)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            applyAreaToUrl(filterValue)
                                        }
                                    }}
                                />
                            ))}
                        </svg>
                    </div>
                </div>

                <ul
                    className="grid shrink-0 grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1 xl:w-[min(100%,220px)]"
                    role="list"
                    aria-label={dict.area_map_title}
                >
                    {rows.map(({ key, filterValue, label }) => {
                        const active = selectedArea === filterValue
                        const hover = hoveredValue === filterValue
                        return (
                            <li key={key}>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoveredValue(filterValue)}
                                    onMouseLeave={() => setHoveredValue(null)}
                                    onFocus={() => setHoveredValue(filterValue)}
                                    onBlur={() => setHoveredValue(null)}
                                    onClick={() => applyAreaToUrl(filterValue)}
                                    className={cn(
                                        'w-full rounded-xl border px-3 py-2.5 text-left text-xs font-black transition-colors sm:py-2',
                                        active
                                            ? 'border-navy-primary bg-navy-primary text-white shadow-md shadow-navy-primary/20'
                                            : hover
                                              ? 'border-navy-primary/40 bg-navy-primary/10 text-navy-primary'
                                              : 'border-slate-200 bg-slate-50/80 text-navy-secondary hover:border-navy-primary/25'
                                    )}
                                >
                                    {label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}
