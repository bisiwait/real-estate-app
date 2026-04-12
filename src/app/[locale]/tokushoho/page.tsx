import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/get-dictionary'

type TokushohoRow = { label: string; value: string }

type TokushohoPageDict = {
    title: string
    meta_description?: string
    updated_label?: string
    updated_date?: string
    back_home?: string
    stripe_note_title?: string
    stripe_note_body?: string
    table_header_item?: string
    table_header_content?: string
    /** en/th など：日本語版への誘導のみ */
    fallback_note?: string
    fallback_link?: string
    rows?: TokushohoRow[]
}

function buildRowsFromFlat(t: Record<string, string>): TokushohoRow[] | null {
    const pairs: [string, string][] = [
        ['row_seller_label', 'row_seller_value'],
        ['row_manager_label', 'row_manager_value'],
        ['row_address_label', 'row_address_value'],
        ['row_phone_label', 'row_phone_value'],
        ['row_email_label', 'row_email_value'],
        ['row_price_label', 'row_price_value'],
        ['row_fees_label', 'row_fees_value'],
        ['row_payment_timing_label', 'row_payment_timing_value'],
        ['row_payment_method_label', 'row_payment_method_value'],
        ['row_delivery_label', 'row_delivery_value'],
        ['row_refund_label', 'row_refund_value'],
    ]
    const rows: TokushohoRow[] = []
    for (const [lk, vk] of pairs) {
        const label = t[lk]
        const value = t[vk]
        if (!label || !value) return null
        rows.push({ label, value })
    }
    return rows
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const tk = dict.tokushoho_page as TokushohoPageDict | undefined
    return {
        title: tk?.title ? `${tk.title} | Chonburi Home` : 'Legal notice',
        description: tk?.meta_description,
    }
}

export default async function TokushohoPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const raw = dict.tokushoho_page as TokushohoPageDict | Record<string, string> | undefined

    if (!raw || typeof raw !== 'object') {
        return (
            <div className="container mx-auto px-4 py-20 text-center text-slate-500">
                Page not configured for this locale.
            </div>
        )
    }

    const tk = raw as TokushohoPageDict
    const flat = raw as Record<string, string>
    const rows = tk.rows ?? buildRowsFromFlat(flat)

    if (tk.fallback_note) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <div className="border-b border-slate-200 bg-white">
                    <div className="container mx-auto max-w-3xl px-4 py-8">
                        <Link
                            href={`/${locale}`}
                            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-navy-primary"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {tk.back_home ?? 'Home'}
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight text-navy-secondary md:text-4xl">{tk.title}</h1>
                    </div>
                </div>
                <article className="container mx-auto max-w-3xl px-4 py-10">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-10">
                        <p className="text-[15px] leading-relaxed text-slate-600 md:text-base">{tk.fallback_note}</p>
                        {tk.fallback_link ? (
                            <p className="mt-6">
                                <Link
                                    href="/jp/tokushoho"
                                    className="font-bold text-navy-primary underline decoration-navy-primary/30 underline-offset-4 hover:text-navy-secondary"
                                >
                                    {tk.fallback_link}
                                </Link>
                            </p>
                        ) : null}
                    </div>
                </article>
            </div>
        )
    }

    if (!rows?.length) {
        return (
            <div className="container mx-auto px-4 py-20 text-center text-slate-500">
                Page not configured for this locale.
            </div>
        )
    }

    const itemHeader = tk.table_header_item ?? flat.table_header_item ?? '項目'
    const contentHeader = tk.table_header_content ?? flat.table_header_content ?? '内容'

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="border-b border-slate-200 bg-white">
                <div className="container mx-auto max-w-3xl px-4 py-8">
                    <Link
                        href={`/${locale}`}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-navy-primary"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {tk.back_home ?? 'ホーム'}
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-navy-secondary md:text-4xl">{tk.title}</h1>
                    {(tk.updated_label || tk.updated_date) && (
                        <p className="mt-3 text-xs font-medium text-slate-400">
                            {tk.updated_label && <span>{tk.updated_label}: </span>}
                            {tk.updated_date}
                        </p>
                    )}
                </div>
            </div>

            <article className="container mx-auto max-w-3xl px-4 py-10">
                {(tk.stripe_note_title || tk.stripe_note_body) && (
                    <div className="mb-8 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 text-sm leading-relaxed text-amber-950 md:p-6">
                        {tk.stripe_note_title ? (
                            <h2 className="mb-2 font-black text-amber-950">{tk.stripe_note_title}</h2>
                        ) : null}
                        {tk.stripe_note_body ? <p className="font-medium text-amber-950/95">{tk.stripe_note_body}</p> : null}
                    </div>
                )}

                <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                    <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/90">
                                <th
                                    scope="col"
                                    className="w-[32%] px-4 py-3.5 text-xs font-black text-navy-secondary md:px-6 md:py-4 md:text-sm"
                                >
                                    {itemHeader}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-3.5 text-xs font-black text-navy-secondary md:px-6 md:py-4 md:text-sm"
                                >
                                    {contentHeader}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-slate-100 last:border-0 [&:nth-child(even)]:bg-slate-50/40"
                                >
                                    <th
                                        scope="row"
                                        className="align-top px-4 py-3.5 font-bold text-navy-secondary md:px-6 md:py-4"
                                    >
                                        {row.label}
                                    </th>
                                    <td className="whitespace-pre-line px-4 py-3.5 font-medium leading-relaxed text-slate-600 md:px-6 md:py-4">
                                        {row.value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    )
}
