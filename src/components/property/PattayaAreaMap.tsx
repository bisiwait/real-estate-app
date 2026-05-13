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

/** viewBox 0–1000。背景画像の色分けに合わせたクリック領域 */
const PATTAYA_REGION_SHAPES: { value: string; points: string }[] = [
    {
        value: 'North Pattaya / Wongamat',
        points: '44,118 52,248 88,272 318,268 612,252 628,108 520,96 280,90',
    },
    { value: 'Central Pattaya', points: '54,278 608,262 616,402 48,406' },
    { value: 'Pratumnak', points: '18,412 304,402 336,578 12,588 8,488' },
    { value: 'South Pattaya', points: '344,406 612,412 622,578 352,572' },
    { value: 'Jomtien', points: '16,594 618,584 658,962 12,958' },
    { value: 'East Pattaya', points: '636,72 984,76 978,970 642,968' },
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
