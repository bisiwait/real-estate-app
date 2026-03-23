import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Loader2 } from "lucide-react";
import CompareClient from "./CompareClient";

export const dynamic = "force-dynamic";

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-10 h-10 text-navy-primary animate-spin mb-4" />
                    <p className="text-slate-400 text-sm font-bold">{dict.compare?.loading || "Loading…"}</p>
                </div>
            }
        >
            <CompareClient locale={locale} dict={dict} />
        </Suspense>
    );
}
