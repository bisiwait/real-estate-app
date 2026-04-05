import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { stripeSubscriptionCheckoutAvailable } from "@/lib/stripe-subscription-prices";
import AgentListingPricingClient from "./AgentListingPricingClient";

/** Stripe の設定はデプロイ後に変わるため、ビルド時固定の SSG にしない */
export const dynamic = "force-dynamic";

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
    const stripeCheckoutReady = stripeSubscriptionCheckoutAvailable();
    return (
        <AgentListingPricingClient dict={dict} locale={locale} stripeCheckoutReady={stripeCheckoutReady} />
    );
}
