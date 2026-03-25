import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import AgentListingPricingClient from "./AgentListingPricingClient";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    const p = dict.agent_plan;
    return {
        title: p?.meta_title ?? "Pricing",
        description: p?.meta_description,
    };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);
    return <AgentListingPricingClient dict={dict} locale={locale} />;
}
