import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";

type FaqItem = { q: string; a: string };

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    const fp = dict.faq_page as { meta_title?: string; meta_description?: string };
    return {
        title: fp.meta_title,
        description: fp.meta_description,
    };
}

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
    return (
        <section className="scroll-mt-24">
            <h2 className="mb-6 border-b border-navy-primary/20 pb-2 text-xl font-black text-navy-secondary md:text-2xl">{title}</h2>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <details
                        key={i}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:border-navy-primary/15 [&[open]_.faq-chevron]:rotate-180"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-bold text-navy-secondary md:px-6 [&::-webkit-details-marker]:hidden">
                            <span className="leading-snug">{item.q}</span>
                            <ChevronDown className="faq-chevron h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200" aria-hidden />
                        </summary>
                        <div className="border-t border-slate-100 px-5 py-4 text-sm font-medium leading-relaxed text-slate-600 md:px-6">
                            {item.a}
                        </div>
                    </details>
                ))}
            </div>
        </section>
    );
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    const fp = dict.faq_page as {
        title: string;
        subtitle: string;
        cat_property_title: string;
        cat_life_title: string;
        cat_system_title: string;
        items_property: FaqItem[];
        items_life: FaqItem[];
        items_system: FaqItem[];
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 pt-12 md:pt-16">
            <div className="container mx-auto max-w-3xl px-4">
                <header className="mb-12 text-center md:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-navy-secondary md:text-4xl">{fp.title}</h1>
                    <p className="mt-3 text-sm font-medium text-slate-500 md:text-base">{fp.subtitle}</p>
                </header>
                <div className="space-y-14 md:space-y-16">
                    <FaqSection title={fp.cat_property_title} items={fp.items_property} />
                    <FaqSection title={fp.cat_life_title} items={fp.items_life} />
                    <FaqSection title={fp.cat_system_title} items={fp.items_system} />
                </div>
            </div>
        </div>
    );
}
