/**
 * Stripe Checkout（サブスク）。
 * 既定ではダッシュボードの Product に依存せず、インラインの price_data（Pro・USD $160/月・$1,600/年）で Session を作成する。
 * 旧カタログ Price を使う場合のみ `STRIPE_CHECKOUT_USE_CATALOG_PRICES=true` と Price ID を設定する。
 */
import { NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import {
    resolveSubscriptionPriceId,
    type SubscriptionBillingInterval,
} from '@/lib/stripe-subscription-prices'
import { buildProPlanInlineSubscriptionLineItem } from '@/lib/stripe-inline-pro-subscription'
import { getPublicSiteUrl } from '@/lib/site-url'

const BASE_URL = getPublicSiteUrl()

interface CheckoutRequestBody {
    priceId?: string
    /** 未指定時はサーバー環境変数から Price ID を解決（カタログモード時のみ） */
    billingInterval?: SubscriptionBillingInterval
}

function useCatalogPrices(): boolean {
    return process.env.STRIPE_CHECKOUT_USE_CATALOG_PRICES === 'true'
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CheckoutRequestBody>
        const billingInterval: SubscriptionBillingInterval =
            body.billingInterval === 'year' ? 'year' : 'month'

        const catalogMode = useCatalogPrices()
        const priceId = catalogMode
            ? resolveSubscriptionPriceId({
                  billingInterval,
                  explicitPriceId: body.priceId,
              })
            : null

        if (catalogMode && !priceId) {
            return NextResponse.json(
                {
                    error:
                        'カタログ課金モードですが Price ID が解決できません。STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY を設定するか、STRIPE_CHECKOUT_USE_CATALOG_PRICES を外してインライン課金にしてください。',
                },
                { status: 400 }
            )
        }

        // 認証チェック: ログイン済みユーザーのみ決済可能
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'ログインが必要です。' },
                { status: 401 }
            )
        }

        const { data: profileRow } = await supabase
            .from('profiles')
            .select('stripe_trial_consumed_at')
            .eq('id', user.id)
            .maybeSingle()

        const trialAlreadyUsed = Boolean(profileRow?.stripe_trial_consumed_at)

        const lineItems = catalogMode
            ? [{ price: priceId!, quantity: 1 }]
            : [buildProPlanInlineSubscriptionLineItem(billingInterval)]

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            branding_settings: {
                display_name: 'Chonburi Home',
            },
            line_items: lineItems,
            subscription_data: {
                ...(trialAlreadyUsed
                    ? {}
                    : {
                          trial_period_days: 30,
                      }),
                metadata: {
                    userId: user.id,
                },
            },
            // {CHECKOUT_SESSION_ID} は Stripe が自動的に展開するプレースホルダー
            success_url: `${BASE_URL}/jp/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${BASE_URL}/jp/pricing`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
            },
        })

        return NextResponse.json({ sessionId: session.id, url: session.url })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[checkout] Stripe session creation failed:', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
