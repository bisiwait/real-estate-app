import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import PropertiesClient from "./PropertiesClient";
import { getCachedPropertiesListFirstPage } from "@/lib/services/propertiesListCache";

/** ISR: 一覧のサーバー取得（初回ページ＋ unstable_cache）を 1 時間単位で再検証 */
export const revalidate = 3600;

export default async function PropertiesPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { locale } = await params;
    const sp = await searchParams;
    const dict = await getDictionary(locale);
    const { formatted, count, pageSize } = await getCachedPropertiesListFirstPage(sp);
    const initialHasMore = count ? formatted.length < count : formatted.length === pageSize;

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-navy-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            }
        >
            <PropertiesClient
                dict={dict}
                locale={locale}
                initialProperties={formatted}
                initialTotalCount={count}
                initialHasMore={initialHasMore}
                skipInitialClientFetch
            />
        </Suspense>
    );
}
