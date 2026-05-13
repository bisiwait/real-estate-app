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

/** viewBox 0–1000 に合わせたクリック領域（背景画像と同じ比率） */
const PATTAYA_REGION_SHAPES: { value: string; points: string }[] = [
    { value: 'North Pattaya / Wongamat', points: '70,55 610,55 640,210 50,210' },
    { value: 'Central Pattaya', points: '55,215 600,215 620,360 45,360' },
    { value: 'Pratumnak', points: '40,365 360,365 395,560 25,560' },
    { value: 'South Pattaya', points: '365,365 615,365 640,560 350,560' },
    { value: 'Jomtien', points: '35,565 640,565 670,960 20,960' },
    { value: 'East Pattaya', points: '625,55 980,55 980,960 655,960' },
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
                width={1000}
                height={1000}
                className="h-auto w-full select-none"
                priority={false}
            />
            <svg
                viewBox="0 0 1000 1000"
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
