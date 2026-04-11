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

/** 掲載日・更新日を表示（周辺の補助テキストと同系色）。 */
export default function FreshnessBadge({ createdAt, updatedAt, locale = 'jp' }: FreshnessBadgeProps) {
    const listing = new Date(createdAt)
    const loc = dateLocaleForUi(locale)
    const listedLabel = formatDay(listing, loc)

    const rawUpdated = updatedAt?.trim() ? new Date(updatedAt) : listing
    const updatedLabel = formatDay(rawUpdated, loc)

    const { listed, updated } = COPY[locale] ?? COPY.en

    return (
        <span
            className="inline-flex max-w-full flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black leading-tight text-slate-600 sm:text-[10px]"
            title={
                locale === 'jp'
                    ? '掲載日は物件作成日の目安です。更新日は最終更新（編集・掲載更新など）の日時です。'
                    : undefined
            }
        >
            <span className="normal-case">
                {listed} {listedLabel}
            </span>
            <span className="normal-case font-bold">
                {updated} {updatedLabel}
            </span>
        </span>
    )
}
