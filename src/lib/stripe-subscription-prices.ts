/**
 * エージェント向けサブスクの Stripe Price ID（プロプラン: US$160/月・US$1,600/年 に相当する recurring Price を Stripe で作成し、その ID を設定）。
 * Vercel ではサーバー専用の STRIPE_PRICE_ID_* を推奨（NEXT_PUBLIC 不要）。
 * ローカル互換のため NEXT_PUBLIC_* もフォールバックで読む。
 */

export type SubscriptionBillingInterval = "month" | "year";

function monthlyId() {
    return (
        process.env.STRIPE_PRICE_ID_MONTHLY?.trim() ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY?.trim() ||
        ""
    );
}

function yearlyId() {
    return (
        process.env.STRIPE_PRICE_ID_YEARLY?.trim() ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY?.trim() ||
        ""
    );
}

export function stripeSubscriptionPriceIdsConfigured(): boolean {
    return monthlyId().length > 0 && yearlyId().length > 0;
}

/** Stripe Secret があれば、Price ID なしでもインライン price_data で Checkout 可能 */
export function stripeSecretKeyConfigured(): boolean {
    const k = process.env.STRIPE_SECRET_KEY?.trim()
    return Boolean(k && k !== 'dummy_key_for_build')
}

/** 料金ページで「お申し込み」ボタンを出す条件（Price ID 方式 or シークレットキー方式） */
export function stripeSubscriptionCheckoutAvailable(): boolean {
    return stripeSubscriptionPriceIdsConfigured() || stripeSecretKeyConfigured()
}

export function resolveSubscriptionPriceId(params: {
    billingInterval: SubscriptionBillingInterval;
    /** クライアントから明示された場合（後方互換） */
    explicitPriceId?: string | null;
}): string | null {
    const explicit = params.explicitPriceId?.trim();
    if (explicit) return explicit;
    if (params.billingInterval === "year") {
        const y = yearlyId();
        return y || null;
    }
    const m = monthlyId();
    return m || null;
}
