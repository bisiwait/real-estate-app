export const runtime = 'edge';
import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Loader2 } from "lucide-react";
import MyPageClient from "./MyPageClient";

export default async function MyPage({ params }: { params: { locale: string } }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-navy-primary animate-spin mb-6" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                    {dict?.labels?.loading || "Loading..."}
                </p>
            </div>
        }>
            <MyPageClient dict={dict} locale={locale} />
        </Suspense>
    );
}
