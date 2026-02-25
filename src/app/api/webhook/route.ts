import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
})

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS
)

export async function POST(req: Request) {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const credits = parseInt(session.metadata?.credits || '0')

        if (userId && credits > 0) {
            // 1. Update Profile Credits
            const { error: profileError } = await supabase.rpc('add_credits', {
                user_id_param: userId,
                credits_param: credits
            })

            // 2. Log Payment
            await supabase.from('payments').insert([
                {
                    user_id: userId,
                    stripe_session_id: session.id,
                    amount: session.amount_total ? session.amount_total / 1 : 0,
                    credits_purchased: credits,
                    status: 'succeeded'
                }
            ])

            if (profileError) {
                console.error('Error adding credits:', profileError)
            }
        }
    }

    return NextResponse.json({ received: true })
}
