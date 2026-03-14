import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage({ params }: { params: { locale: string } }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-navy-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <PropertiesClient dict={dict} locale={locale} />
        </Suspense>
    );
}
