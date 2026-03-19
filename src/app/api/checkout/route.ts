import { NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_SITE_URL → localhost の優先順でフォールバック
const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'

interface CheckoutRequestBody {
    priceId: string
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Partial<CheckoutRequestBody>
        const { priceId } = body

        if (!priceId || typeof priceId !== 'string' || priceId.trim() === '') {
            return NextResponse.json(
                { error: 'priceId は必須です（Stripe の Price ID を指定してください）。' },
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
