import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'

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
    supabaseAdmin: SupabaseClient,
    userId: string,
    subscriptionId: string | null,
    trialEnd: number | null
) {
    const periodEnd = trialEnd
        ? new Date(trialEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

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
        throw coreError
    }

    if (subscriptionId) {
        const { error: subError } = await supabaseAdmin
            .from('profiles')
            .update({ stripe_subscription_id: subscriptionId, auto_renew: true })
            .eq('id', userId)

        if (subError) {
            console.warn('[webhook] activatePremium optional fields skipped:', subError.message)
        }
    }

    console.log(`[webhook] profiles updated to premium for user: ${userId}`)
}

async function deactivatePremium(supabaseAdmin: SupabaseClient, userId: string) {
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

    await supabaseAdmin
        .from('profiles')
        .update({ stripe_subscription_id: null, auto_renew: false })
        .eq('id', userId)
        .then(({ error }) => {
            if (error) console.warn('[webhook] deactivatePremium optional fields skipped:', error.message)
        })
}

async function findUserBySubscriptionId(
    supabaseAdmin: SupabaseClient,
    subscriptionId: string
): Promise<string | null> {
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
async function logPayment(
    supabaseAdmin: SupabaseClient,
    params: {
        userId: string
        sessionId: string
        subscriptionId: string | null
        amount: number
    }
) {
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

    let event: Stripe.Event
    try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[webhook] Signature verification failed:', msg)
        return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
    }

    console.log(`[webhook] Received event: ${event.type} (${event.id})`)

    const hdrs = await headers()
    let supabaseAdmin: SupabaseClient
    try {
        const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(hostHeaderFromHeaders(hdrs))
        supabaseAdmin = createClient(url, serviceRoleKey)
    } catch (e) {
        console.error('[webhook] Supabase admin client:', e)
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session

                const userId = session.metadata?.userId ?? session.client_reference_id

                if (!userId) {
                    console.warn('[webhook] checkout.session.completed: userId not found. metadata:', session.metadata)
                    break
                }

                const subscriptionId = extractSubscriptionId(session.subscription)

                let trialEnd: number | null = null
                if (subscriptionId) {
                    try {
                        const sub = await stripe.subscriptions.retrieve(subscriptionId)
                        trialEnd = sub.trial_end
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

                await activatePremium(supabaseAdmin, userId, subscriptionId, trialEnd)

                await logPayment(supabaseAdmin, {
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
                    await deactivatePremium(supabaseAdmin, userId)
                    console.log(`[webhook] Premium deactivated (subscription ${sub.status}) for user: ${userId}`)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription
                const userId =
                    sub.metadata?.userId ?? (await findUserBySubscriptionId(supabaseAdmin, sub.id))

                if (!userId) {
                    console.warn('[webhook] customer.subscription.deleted: userId not found')
                    break
                }

                await deactivatePremium(supabaseAdmin, userId)
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
                break
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[webhook] Handler error for ${event.type}:`, msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ received: true })
}
