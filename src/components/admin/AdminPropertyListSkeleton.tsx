'use client'

import { cn } from '@/lib/utils'

type Props = {
    rows?: number
    className?: string
}

/**
 * 物件一覧の再取得中に表示するスケルトン（実データの .filter は行わない前提の「処理中」UI）。
 */
export default function AdminPropertyListSkeleton({ rows = 6, className }: Props) {
    return (
        <div className={cn('animate-pulse space-y-0', className)} aria-busy aria-label="一覧を読み込み中">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="border-b border-slate-100 p-4 md:p-5 last:border-b-0">
                    <div className="flex gap-3 md:gap-4">
                        <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-200 md:h-20 md:w-20" />
                        <div className="min-w-0 flex-1 space-y-2 py-0.5">
                            <div className="flex flex-wrap gap-1">
                                <div className="h-4 w-14 rounded bg-slate-200" />
                                <div className="h-4 w-12 rounded bg-slate-200" />
                                <div className="h-4 w-16 rounded bg-slate-200" />
                            </div>
                            <div className="h-4 w-full max-w-md rounded bg-slate-200" />
                            <div className="flex flex-wrap gap-2">
                                <div className="h-3 w-24 rounded bg-slate-100" />
                                <div className="h-3 w-28 rounded bg-slate-100" />
                            </div>
                        </div>
                        <div className="hidden w-40 shrink-0 flex-col gap-2 md:flex">
                            <div className="h-8 w-full rounded-lg bg-slate-100" />
                            <div className="h-8 w-full rounded-lg bg-slate-100" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
