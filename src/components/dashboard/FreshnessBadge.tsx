'use client'

function dateLocaleForUi(locale: string) {
    if (locale === 'jp') return 'ja-JP'
    if (locale === 'th') return 'th-TH'
    return 'en-US'
}

const COPY: Record<string, { prefix: string }> = {
    jp: { prefix: '掲載' },
    en: { prefix: 'Listed' },
    th: { prefix: 'ลงประกาศ' },
}

interface FreshnessBadgeProps {
    /** 物件レコードの作成日時（掲載開始の目安として表示） */
    createdAt: string
    locale?: string
}

/** 掲載日を表示。掲載から14日以上経過で赤字（掲載更新の促し）。 */
export default function FreshnessBadge({ createdAt, locale = 'jp' }: FreshnessBadgeProps) {
    const listing = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - listing.getTime()
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const stale = diffDays >= 14

    const loc = dateLocaleForUi(locale)
    const dateLabel = listing.toLocaleDateString(loc, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
    const prefix = COPY[locale]?.prefix ?? COPY.en.prefix

    return (
        <span
            className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest sm:text-[10px] ${
                stale
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            title={
                locale === 'jp'
                    ? '物件の作成日（掲載の目安）です。14日以上経過すると赤字表示になります。'
                    : undefined
            }
        >
            <span className="truncate normal-case">
                {prefix} {dateLabel}
            </span>
        </span>
    )
}
