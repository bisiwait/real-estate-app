'use client'

import Image from 'next/image'
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

/** public/images/pattaya-area-map.png の実ピクセル寸法（viewBox と一致させる） */
const MAP_WIDTH = 780
const MAP_HEIGHT = 752

/** 画像幅・高さに対する % で定義し、座標ずれを防ぐ */
function mapPoint(xPercent: number, yPercent: number): string {
    return `${Math.round((MAP_WIDTH * xPercent) / 100)},${Math.round((MAP_HEIGHT * yPercent) / 100)}`
}

function mapPolygon(points: Array<[number, number]>): string {
    return points.map(([x, y]) => mapPoint(x, y)).join(' ')
}

const PATTAYA_REGION_SHAPES: { value: string; points: string }[] = [
    {
        value: 'North Pattaya / Wongamat',
        points: mapPolygon([
            [46, 5.5],
            [63, 5.5],
            [63, 18.5],
            [50, 19.5],
            [22, 18.5],
            [12, 13],
            [32, 6.5],
        ]),
    },
    {
        value: 'Central Pattaya',
        points: mapPolygon([
            [27, 19.5],
            [63, 19],
            [63, 43],
            [25, 43.5],
        ]),
    },
    {
        value: 'Pratumnak',
        points: mapPolygon([
            [4.5, 39],
            [38, 38],
            [40.5, 58],
            [3.5, 59],
            [3, 48],
        ]),
    },
    {
        value: 'South Pattaya',
        points: mapPolygon([
            [39, 40],
            [62.5, 40.5],
            [62.5, 57.5],
            [38.5, 57],
        ]),
    },
    {
        value: 'Jomtien',
        points: mapPolygon([
            [15, 58.5],
            [62.5, 57.5],
            [64, 95.5],
            [13.5, 95],
        ]),
    },
    {
        value: 'East Pattaya',
        points: mapPolygon([
            [63.5, 5.5],
            [98, 5.5],
            [97, 96.5],
            [63.5, 96.5],
        ]),
    },
]

export default function PattayaAreaMap({
    areas,
    selectedArea,
    onSelectArea,
    className,
}: PattayaAreaMapProps) {
    const labelByValue = Object.fromEntries(areas.map((a) => [a.value, a.label]))

    return (
        <div className={cn('relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
            <Image
                src="/images/pattaya-area-map.png"
                alt=""
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className="block h-auto w-full select-none"
                priority={false}
            />
            <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Pattaya area map"
            >
                {PATTAYA_REGION_SHAPES.map(({ value, points }) => {
                    const isSelected = selectedArea === value
                    const label = labelByValue[value] ?? value
                    return (
                        <polygon
                            key={value}
                            points={points}
                            className={cn(
                                'cursor-pointer transition-[fill,stroke] duration-150',
                                isSelected
                                    ? 'fill-navy-primary/35 stroke-navy-primary stroke-[3]'
                                    : 'fill-transparent stroke-transparent hover:fill-navy-primary/15 hover:stroke-navy-primary/50 hover:stroke-[2]'
                            )}
                            onClick={() => onSelectArea(selectedArea === value ? '' : value)}
                        >
                            <title>{label}</title>
                        </polygon>
                    )
                })}
            </svg>
        </div>
    )
}
