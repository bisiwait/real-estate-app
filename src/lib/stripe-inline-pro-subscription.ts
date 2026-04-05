import type Stripe from 'stripe'
import type { SubscriptionBillingInterval } from '@/lib/stripe-subscription-prices'

/** Stripe Checkout 用: USD・セント。$160/月・$1,600/年 */
export const PRO_PLAN_UNIT_AMOUNT_MONTHLY_USD_CENTS = 16_000
export const PRO_PLAN_UNIT_AMOUNT_YEARLY_USD_CENTS = 160_000

/**
 * カタログの Price ID を使わず、Checkout 上の商品名・金額をアプリ側で固定する。
 * （Stripe ダッシュボードの旧「Premium / 円」Product に依存しない）
 */
export function buildProPlanInlineSubscriptionLineItem(
    billingInterval: SubscriptionBillingInterval
): Stripe.Checkout.SessionCreateParams.LineItem {
    const yearly = billingInterval === 'year'
    return {
        quantity: 1,
        price_data: {
            currency: 'usd',
            unit_amount: yearly
                ? PRO_PLAN_UNIT_AMOUNT_YEARLY_USD_CENTS
                : PRO_PLAN_UNIT_AMOUNT_MONTHLY_USD_CENTS,
            recurring: { interval: yearly ? 'year' : 'month' },
            product_data: {
                name: yearly ? 'Chonburi Home — Pro Plan (Yearly)' : 'Chonburi Home — Pro Plan (Monthly)',
                description: yearly
                    ? 'プロプラン・年払い（USD）'
                    : 'プロプラン・月払い（USD）',
            },
        },
    }
}
