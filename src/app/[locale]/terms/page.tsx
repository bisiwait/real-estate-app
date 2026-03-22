import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/get-dictionary'

type TermsSubsection = { heading: string; body: string }
type TermsSection = {
    title: string
    paragraphs?: string[]
    subsections?: TermsSubsection[]
}

type TermsPageDict = {
    title: string
    meta_description?: string
    updated_label?: string
    updated_date?: string
    back_home?: string
    sections: TermsSection[]
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const tp = (dict as { terms_page?: TermsPageDict }).terms_page
    return {
        title: tp?.title ? `${tp.title} | Chonburi Connect` : 'Terms of Service',
        description: tp?.meta_description,
    }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const dict = await getDictionary(locale)
    const tp = (dict as { terms_page?: TermsPageDict }).terms_page

    if (!tp?.sections?.length) {
        return (
            <div className="container mx-auto px-4 py-20 text-center text-slate-500">
                Terms not configured for this locale.
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="border-b border-slate-200 bg-white">
                <div className="container mx-auto max-w-3xl px-4 py-8">
                    <Link
                        href={`/${locale}`}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-navy-primary"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {tp.back_home || 'ホーム'}
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-navy-secondary md:text-4xl">
                        {tp.title}
                    </h1>
                    {(tp.updated_label || tp.updated_date) && (
                        <p className="mt-3 text-xs font-medium text-slate-400">
                            {tp.updated_label && <span>{tp.updated_label}: </span>}
                            {tp.updated_date}
                        </p>
                    )}
                </div>
            </div>

            <article className="container mx-auto max-w-3xl px-4 py-10">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-10">
                    {tp.sections.map((sec, i) => (
                        <section
                            key={i}
                            className="mb-10 border-b border-slate-100 pb-10 last:mb-0 last:border-0 last:pb-0"
                        >
                            <h2 className="mb-5 text-lg font-black text-navy-primary md:text-xl">{sec.title}</h2>
                            {sec.paragraphs?.map((p, j) => (
                                <p
                                    key={j}
                                    className="mb-4 text-[15px] leading-relaxed text-slate-600 last:mb-0 md:text-base"
                                >
                                    {p}
                                </p>
                            ))}
                            {sec.subsections?.map((sub, k) => (
                                <div key={k} className="mb-6 last:mb-0">
                                    <h3 className="mb-2 text-sm font-black text-navy-secondary md:text-base">
                                        {sub.heading}
                                    </h3>
                                    <p className="text-[15px] leading-relaxed text-slate-600 md:text-base">{sub.body}</p>
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            </article>
        </div>
    )
}
