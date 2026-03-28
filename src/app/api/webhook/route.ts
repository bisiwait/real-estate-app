import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

// RLS をバイパスするためサービスロールキーで Supabase クライアントを作成
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dummy.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dummy_key_for_build'
)

// -------- ヘルパー --------

function extractSubscriptionId(sub: string | Stripe.Subscription | null): string | null {
    if (!sub) return null
    if (typeof sub === 'string') return sub
    return sub.id
}

/**
 * profiles テーブルをプレミアムに昇格させる
 * - まず確実に存在する plan / plan_type / current_period_end を更新
 * - stripe_subscription_id / auto_renew は別途試行（カラムがなくても 500 にしない）
 */
async function activatePremium(
    userId: string,
    subscriptionId: string | null,
    trialEnd: number | null
) {
    const periodEnd = trialEnd
        ? new Date(trialEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // ── 必須フィールド（既存カラム確定分）──
    const { error: coreError } = await supabaseAdmin
        .from('profiles')
        .update({
            plan: 'premium',
            plan_type: 'premium',
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

    if (coreError) {
        console.error('[webhook] activatePremium core update error:', coreError)
        throw coreError // 必須フィールドの失敗はエラーとして扱う
    }

    // ── オプショナルフィールド（カラムがなければ無視）──
    if (subscriptionId) {
        const { error: subError } = await supabaseAdmin
            .from('profiles')
            .update({ stripe_subscription_id: subscriptionId, auto_renew: true })
            .eq('id', userId)

        if (subError) {
            // カラム未作成の場合でも 500 にしない
            console.warn('[webhook] activatePremium optional fields skipped:', subError.message)
        }
    }

    console.log(`[webhook] profiles updated to premium for user: ${userId}`)
}

async function deactivatePremium(userId: string) {
    const { error: coreError } = await supabaseAdmin
        .from('profiles')
        .update({
            plan: 'free',
            plan_type: 'free',
            current_period_end: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

    if (coreError) {
        console.error('[webhook] deactivatePremium core update error:', coreError)
        throw coreError
    }

    // オプショナルフィールドのクリア
    await supabaseAdmin
        .from('profiles')
        .update({ stripe_subscription_id: null, auto_renew: false })
        .eq('id', userId)
        .then(({ error }) => {
            if (error) console.warn('[webhook] deactivatePremium optional fields skipped:', error.message)
        })
}

async function findUserBySubscriptionId(subscriptionId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

    if (error) {
        console.warn('[webhook] findUserBySubscriptionId error:', error.message)
        return null
    }
    return data?.id ?? null
}

/** payments テーブルへのログ記録（失敗しても 500 にしない）*/
async function logPayment(params: {
    userId: string
    sessionId: string
    subscriptionId: string | null
    amount: number
}) {
    // まず最小限のカラムで insert
    const { error } = await supabaseAdmin.from('payments').insert({
        user_id: params.userId,
        stripe_session_id: params.sessionId,
        amount: params.amount,
        status: 'succeeded',
        created_at: new Date().toISOString(),
    })

    if (error) {
        console.warn('[webhook] logPayment insert error (non-fatal):', error.message)
        return
    }

    // stripe_subscription_id カラムがある場合のみ更新
    if (params.subscriptionId) {
        await supabaseAdmin
            .from('payments')
            .update({ stripe_subscription_id: params.subscriptionId })
            .eq('stripe_session_id', params.sessionId)
            .then(({ error: e }) => {
                if (e) console.warn('[webhook] logPayment subscription_id update skipped:', e.message)
            })
    }
}

// -------- メインハンドラ --------

export async function POST(req: Request) {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
        console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // ----- 署名検証 -----
    let event: Stripe.Event
    try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[webhook] Signature verification failed:', msg)
        return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
    }

    console.log(`[webhook] Received event: ${event.type} (${event.id})`)

    try {
        switch (event.type) {

            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                // userId の取得: metadata.userId → client_reference_id の順で試みる
                const userId = session.metadata?.userId ?? session.client_reference_id

                if (!userId) {
                    console.warn('[webhook] checkout.session.completed: userId not found. metadata:', session.metadata)
                    break
                }

                const subscriptionId = extractSubscriptionId(session.subscription)

                // trial_end を Stripe から取得（失敗しても処理を続行）
                let trialEnd: number | null = null
                if (subscriptionId) {
                    try {
                        const sub = await stripe.subscriptions.retrieve(subscriptionId)
                        trialEnd = sub.trial_end
                        // トライアル付きサブスクなら「初回トライアル消化済み」にする（再 Checkout で trial を付けない）
                        if (sub.trial_end != null) {
                            const { error: trialFlagError } = await supabaseAdmin
                                .from('profiles')
                                .update({
                                    stripe_trial_consumed_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('id', userId)
                            if (trialFlagError) {
                                console.warn('[webhook] stripe_trial_consumed_at update skipped:', trialFlagError.message)
                            }
                        }
                    } catch (e) {
                        console.warn('[webhook] Could not retrieve subscription trial_end:', e)
                    }
                }

                await activatePremium(userId, subscriptionId, trialEnd)

                await logPayment({
                    userId,
                    sessionId: session.id,
                    subscriptionId,
                    amount: session.amount_total ?? 0,
                })

                console.log(`[webhook] ✅ Premium activated for user: ${userId}`)
                break
            }

            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription
                const userId = sub.metadata?.userId

                if (!userId) {
                    console.warn('[webhook] customer.subscription.updated: userId not found in metadata')
                    break
                }

                const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

                if (sub.status === 'active' || sub.status === 'trialing') {
                    // cancel_at_period_end=true のとき auto_renew=false にして「解約予約」状態を記録
                    const { error } = await supabaseAdmin
                        .from('profiles')
                        .update({
                            plan: 'premium',
                            plan_type: 'premium',
                            current_period_end: periodEnd,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', userId)

                    if (error) {
                        console.error('[webhook] subscription.updated core error:', error)
                    } else {
                        console.log(
                            `[webhook] Subscription updated for user: ${userId}, status: ${sub.status}, cancel_at_period_end: ${sub.cancel_at_period_end}`
                        )
                    }

                    // auto_renew カラムが存在する場合のみ更新（オプショナル）
                    await supabaseAdmin
                        .from('profiles')
                        .update({ auto_renew: !sub.cancel_at_period_end })
                        .eq('id', userId)
                        .then(({ error: e }) => {
                            if (e) console.warn('[webhook] auto_renew update skipped:', e.message)
                        })
                } else if (
                    sub.status === 'canceled' ||
                    sub.status === 'unpaid' ||
                    sub.status === 'incomplete_expired'
                ) {
                    // 支払不能・キャンセル完了などはフリーに戻す（past_due は猶予のため維持）
                    await deactivatePremium(userId)
                    console.log(`[webhook] Premium deactivated (subscription ${sub.status}) for user: ${userId}`)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription
                const userId = sub.metadata?.userId ?? await findUserBySubscriptionId(sub.id)

                if (!userId) {
                    console.warn('[webhook] customer.subscription.deleted: userId not found')
                    break
                }

                await deactivatePremium(userId)
                console.log(`[webhook] ✅ Premium deactivated for user: ${userId}`)
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const subId = extractSubscriptionId(invoice.subscription)
                console.warn(`[webhook] ⚠️ Payment failed for subscription: ${subId}`)
                break
            }

            default:
                // 200 を返して Stripe のリトライを防ぐ
                break
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[webhook] Handler error for ${event.type}:`, msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
