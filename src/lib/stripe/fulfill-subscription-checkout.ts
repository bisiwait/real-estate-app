import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import stripe from '@/lib/stripe'

export function extractSubscriptionId(sub: string | Stripe.Subscription | null): string | null {
    if (!sub) return null
    if (typeof sub === 'string') return sub
    return sub.id
}

/**
 * profiles をプロプラン相当に昇格（DB 内部値は後方互換のため plan / plan_type は 'premium' のまま）
 */
export async function activatePremium(
    supabaseAdmin: SupabaseClient,
    userId: string,
    subscriptionId: string | null,
    trialEnd: number | null
) {
    const periodEnd = trialEnd
        ? new Date(trialEnd * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: updated, error: coreError } = await supabaseAdmin
        .from('profiles')
        .update({
            plan: 'premium',
            plan_type: 'premium',
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id')

    if (coreError) {
        console.error('[stripe-fulfill] activatePremium core update error:', coreError)
        throw coreError
    }

    if (!updated?.length) {
        console.error(
            `[stripe-fulfill] activatePremium: no profile row for userId=${userId} (auth user exists in Checkout but profiles 行が無い可能性)`
        )
        throw new Error('Profile not found for checkout user')
    }

    if (subscriptionId) {
        const { error: subError } = await supabaseAdmin
            .from('profiles')
            .update({ stripe_subscription_id: subscriptionId, auto_renew: true })
            .eq('id', userId)

        if (subError) {
            console.warn('[stripe-fulfill] activatePremium optional fields skipped:', subError.message)
        }
    }

    console.log(`[stripe-fulfill] profiles updated to Pro plan (plan_type=premium) for user: ${userId}`)
}

/** payments テーブルへのログ記録（失敗しても例外にしない） */
export async function logPayment(
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
        console.warn('[stripe-fulfill] logPayment insert error (non-fatal):', error.message)
        return
    }

    if (params.subscriptionId) {
        await supabaseAdmin
            .from('payments')
            .update({ stripe_subscription_id: params.subscriptionId })
            .eq('stripe_session_id', params.sessionId)
            .then(({ error: e }) => {
                if (e) console.warn('[stripe-fulfill] logPayment subscription_id update skipped:', e.message)
            })
    }
}

export type FulfillCheckoutResult = { ok: true } | { ok: false; reason: 'missing_user_id' }

/**
 * Checkout Session 完了時と同等の処理（Webhook と共有。冪等に近い：プロフィールは上書き、payments は UNIQUE で二重挿入のみ失敗）
 */
export async function fulfillCheckoutSessionCompleted(
    supabaseAdmin: SupabaseClient,
    session: Stripe.Checkout.Session
): Promise<FulfillCheckoutResult> {
    const userId = session.metadata?.userId ?? session.client_reference_id

    if (!userId) {
        console.warn('[stripe-fulfill] checkout session: userId not found. metadata:', session.metadata)
        return { ok: false, reason: 'missing_user_id' }
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
                    console.warn('[stripe-fulfill] stripe_trial_consumed_at update skipped:', trialFlagError.message)
                }
            }
        } catch (e) {
            console.warn('[stripe-fulfill] Could not retrieve subscription trial_end:', e)
        }
    }

    await activatePremium(supabaseAdmin, userId, subscriptionId, trialEnd)

    await logPayment(supabaseAdmin, {
        userId,
        sessionId: session.id,
        subscriptionId,
        amount: session.amount_total ?? 0,
    })

    console.log(`[stripe-fulfill] Pro plan activated for user: ${userId}`)
    return { ok: true }
}
