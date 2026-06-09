import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export type AgentApiSession = {
    user: { id: string; email?: string | null }
    admin: Awaited<ReturnType<typeof createAdminClient>>
    isAdmin: boolean
}

export async function requireAgentApiSession(): Promise<
    { session: AgentApiSession } | { error: NextResponse }
> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const admin = await createAdminClient()
    const { data: profile, error } = await admin
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', user.id)
        .maybeSingle()

    if (error) {
        console.error('[requireAgentApiSession] profile', error)
        return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
    }

    const isAgent =
        profile?.user_role === 'agent' ||
        profile?.user_role === 'admin' ||
        profile?.is_admin === true

    if (!isAgent) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return {
        session: {
            user: { id: user.id, email: user.email },
            admin,
            isAdmin: profile?.is_admin === true || profile?.user_role === 'admin',
        },
    }
}
