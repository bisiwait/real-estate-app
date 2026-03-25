import { NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { resolveSubscriptionPriceId, type SubscriptionBillingInterval } from '@/lib/stripe-subscription-prices'
import { getPublicSiteUrl } from '@/lib/site-url'

// NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_SITE_URL → getPublicSiteUrl()（本番は chonburihome.com 等）
const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    getPublicSiteUrl()

interface CheckoutRequestBody {
    priceId?: string
    /** 未指定時はサーバー環境変数から Price ID を解決 */
    billingInterval?: SubscriptionBillingInterval
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CheckoutRequestBody>
        const billingInterval: SubscriptionBillingInterval =
            body.billingInterval === 'year' ? 'year' : 'month'

        const priceId = resolveSubscriptionPriceId({
            billingInterval,
            explicitPriceId: body.priceId,
        })

        if (!priceId) {
            return NextResponse.json(
                {
                    error:
                        'Stripe の Price ID が未設定です。STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY（または NEXT_PUBLIC 相当）を環境変数に設定してください。',
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

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                // 30日間の無料トライアルを付与
                trial_period_days: 30,
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
