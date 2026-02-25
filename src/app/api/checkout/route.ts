import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
})

const PACKAGES: Record<string, { price: number, credits: number }> = {
    lite: { price: 500, credits: 10 },
    standard: { price: 3500, credits: 100 },
    pro: { price: 20000, credits: 1000 }
}

export async function POST(req: Request) {
    try {
        const { packageId } = await req.json()
        const pkg = PACKAGES[packageId]

        if (!pkg) {
            return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
        }

        // Get real user from Supabase auth
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'jpy',
                        product_data: {
                            name: `Chonburi Connect: ${packageId.toUpperCase()} PLAN`,
                            description: `${pkg.credits} 掲載クレジット`,
                        },
                        unit_amount: pkg.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/list-property?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
            metadata: {
                userId: userId,
                packageId: packageId,
                credits: pkg.credits.toString()
            }
        })

        return NextResponse.json({ url: session.url })
    } catch (err: any) {
        console.error('Checkout error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
