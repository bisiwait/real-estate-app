'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
    tip: string
    children: ReactNode
    className?: string
}

/** ホバーで表示する簡易ツールチップ（Radix 未導入のため CSS のみ） */
export default function AdminHoverTip({ tip, children, className }: Props) {
    return (
        <span className={cn('group relative inline-flex max-w-full align-middle', className)}>
            {children}
            <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-navy-secondary px-2.5 py-1.5 text-left text-[10px] font-bold leading-snug text-white shadow-lg group-hover:block group-focus-within:block"
            >
                {tip}
            </span>
        </span>
    )
}
