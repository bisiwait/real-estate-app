'use client'

function dateLocaleForUi(locale: string) {
    if (locale === 'jp') return 'ja-JP'
    if (locale === 'th') return 'th-TH'
    return 'en-US'
}

const COPY: Record<string, { listed: string; updated: string }> = {
    jp: { listed: '掲載', updated: '更新' },
    en: { listed: 'Listed', updated: 'Updated' },
    th: { listed: 'ลงประกาศ', updated: 'อัปเดต' },
}

function formatDay(d: Date, loc: string) {
    return d.toLocaleDateString(loc, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

interface FreshnessBadgeProps {
    /** 物件レコードの作成日時（掲載開始の目安） */
    createdAt: string
    /** 最終更新日時（未設定時は createdAt を表示に使う） */
    updatedAt?: string | null
    locale?: string
}

/** 掲載日・更新日を表示。掲載から14日以上経過で赤字（掲載更新の促し）。 */
export default function FreshnessBadge({ createdAt, updatedAt, locale = 'jp' }: FreshnessBadgeProps) {
    const listing = new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - listing.getTime()
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const stale = diffDays >= 14

    const loc = dateLocaleForUi(locale)
    const listedLabel = formatDay(listing, loc)

    const rawUpdated = updatedAt?.trim() ? new Date(updatedAt) : listing
    const updatedLabel = formatDay(rawUpdated, loc)

    const { listed, updated } = COPY[locale] ?? COPY.en

    return (
        <span
            className={`inline-flex max-w-full flex-col gap-0.5 rounded-lg border px-2 py-1 text-[9px] font-black leading-tight sm:text-[10px] ${
                stale
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            title={
                locale === 'jp'
                    ? '掲載日は物件作成日の目安です。14日以上経過すると赤字になります。更新日は最終更新（編集・掲載更新など）の日時です。'
                    : undefined
            }
        >
            <span className="normal-case">
                {listed} {listedLabel}
            </span>
            <span className="normal-case font-bold opacity-90">
                {updated} {updatedLabel}
            </span>
        </span>
    )
}
