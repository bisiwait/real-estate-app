import { NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getPublicSiteUrl } from '@/lib/site-url'

const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    getPublicSiteUrl()

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
        }

        // stripe_subscription_id を profiles から取得
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_subscription_id')
            .eq('id', user.id)
            .single()

        let customerId: string | null = null

        if (profile?.stripe_subscription_id) {
            // 1. DB にサブスクリプション ID がある場合
            const subscription = await stripe.subscriptions.retrieve(
                profile.stripe_subscription_id
            )
            customerId =
                typeof subscription.customer === 'string'
                    ? subscription.customer
                    : subscription.customer.id
        } else {
            // 2. DB にない場合、Stripe からメールアドレスで顧客を検索する（救済策）
            if (user.email) {
                const customers = await stripe.customers.list({
                    email: user.email,
                    limit: 1,
                })
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id
                }
            }
        }

        if (!customerId) {
            return NextResponse.json(
                { error: 'Stripe 上に顧客情報が見つかりませんでした。一度も決済されていない可能性があります。' },
                { status: 404 }
            )
        }

        // Stripe カスタマーポータルセッションを作成
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${BASE_URL}/jp/dashboard`,
        })

        return NextResponse.json({ url: portalSession.url })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[create-portal] Error:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
