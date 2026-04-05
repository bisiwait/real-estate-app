import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'
import { fulfillCheckoutSessionCompleted } from '@/lib/stripe/fulfill-subscription-checkout'

/**
 * 決済完了後のリダイレクト時に、Webhook 未達・設定ミスでも DB をプロに同期する。
 * セッションの metadata.userId / client_reference_id がログインユーザーと一致する場合のみ実行。
 */
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { sessionId?: string }
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }

        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription'],
        })

        if (session.mode !== 'subscription') {
            return NextResponse.json({ error: 'Invalid session mode' }, { status: 400 })
        }

        if (session.status !== 'complete') {
            return NextResponse.json({ error: 'Checkout not complete' }, { status: 400 })
        }

        const paymentOk =
            session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
        if (!paymentOk) {
            return NextResponse.json(
                { error: `Payment not settled: ${session.payment_status}` },
                { status: 400 }
            )
        }

        const ownerId = session.metadata?.userId ?? session.client_reference_id ?? null
        if (!ownerId || ownerId !== user.id) {
            return NextResponse.json(
                { error: 'Session does not belong to this account' },
                { status: 403 }
            )
        }

        const hdrs = await headers()
        const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(hostHeaderFromHeaders(hdrs))
        const supabaseAdmin = createAdminClient(url, serviceRoleKey)

        const result = await fulfillCheckoutSessionCompleted(supabaseAdmin, session)
        if (!result.ok) {
            return NextResponse.json({ error: 'Could not fulfill checkout (missing user id)' }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[sync-checkout-session]', err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
