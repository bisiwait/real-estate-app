import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
})

type BillingPeriod = 'monthly' | 'yearly'

export async function POST(req: Request) {
  try {
    const { billingPeriod } = (await req.json()) as { billingPeriod?: BillingPeriod }

    const period: BillingPeriod = billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    const amountTHB = period === 'yearly' ? 48000 : 5000

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `Chonburi Connect: PREMIUM (${period.toUpperCase()})`,
              description: period === 'yearly' ? '年払い（20% OFF）' : '月払い',
            },
            unit_amount: amountTHB * 100,
            recurring: { interval: period === 'yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: user.id,
          plan: 'premium',
          billingPeriod: period,
        },
      },
      client_reference_id: user.id,
      success_url: `${origin}/jp/dashboard/settings?upgrade_success=true`,
      cancel_url: `${origin}/jp/pricing`,
      metadata: {
        userId: user.id,
        plan: 'premium',
        billingPeriod: period,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err: any) {
    console.error('Subscription checkout error:', err)
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

