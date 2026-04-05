import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getPublicSiteUrl } from '@/lib/site-url'
import { buildProPlanInlineSubscriptionLineItem } from '@/lib/stripe-inline-pro-subscription'
import type { SubscriptionBillingInterval } from '@/lib/stripe-subscription-prices'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
})

type BillingPeriod = 'monthly' | 'yearly'

export async function POST(req: Request) {
  try {
    const { billingPeriod } = (await req.json()) as { billingPeriod?: BillingPeriod }

    const period: BillingPeriod = billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    const stripeInterval: SubscriptionBillingInterval = period === 'yearly' ? 'year' : 'month'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('stripe_trial_consumed_at')
      .eq('id', user.id)
      .maybeSingle()

    const trialAlreadyUsed = Boolean(profileRow?.stripe_trial_consumed_at)

    const origin = req.headers.get('origin') || getPublicSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      branding_settings: {
        display_name: 'Chonburi Home',
      },
      line_items: [buildProPlanInlineSubscriptionLineItem(stripeInterval)],
      subscription_data: {
        ...(trialAlreadyUsed ? {} : { trial_period_days: 30 }),
        metadata: {
          userId: user.id,
          plan: 'pro',
          billingPeriod: period,
        },
      },
      client_reference_id: user.id,
      success_url: `${origin}/jp/dashboard/settings?upgrade_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/jp/pricing`,
      metadata: {
        userId: user.id,
        plan: 'pro',
        billingPeriod: period,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err: any) {
    console.error('Subscription checkout error:', err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

