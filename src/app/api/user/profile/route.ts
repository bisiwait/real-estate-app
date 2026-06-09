import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const PROFILE_SELECT =
    'full_name, phone, avatar_url, user_role, is_admin, email'

async function sessionUserId() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    return user
}

async function loadProfile(userId: string) {
    const admin = await createAdminClient()
    return admin.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle()
}

function isAgentProfile(profile: { user_role?: string | null; is_admin?: boolean | null }) {
    return (
        profile.is_admin === true ||
        profile.user_role === 'admin' ||
        profile.user_role === 'agent'
    )
}

export async function GET() {
    try {
        const user = await sessionUserId()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, error } = await loadProfile(user.id)
        if (error) {
            console.error('[api/user/profile] GET', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        return NextResponse.json({
            profile: {
                ...data,
                email: user.email ?? data.email ?? null,
            },
        })
    } catch (e) {
        console.error('[api/user/profile] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await sessionUserId()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: existing, error: loadError } = await loadProfile(user.id)
        if (loadError) {
            console.error('[api/user/profile] PATCH load', loadError)
            return NextResponse.json({ error: loadError.message }, { status: 500 })
        }
        if (!existing) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }
        if (isAgentProfile(existing)) {
            return NextResponse.json({ error: 'Use agent settings' }, { status: 403 })
        }

        const body = (await request.json().catch(() => ({}))) as {
            full_name?: string
            phone?: string
        }

        const updates: Record<string, string | null> = {}
        if (body.full_name !== undefined) {
            const v = typeof body.full_name === 'string' ? body.full_name.trim() : ''
            updates.full_name = v || null
        }
        if (body.phone !== undefined) {
            const v = typeof body.phone === 'string' ? body.phone.trim() : ''
            updates.phone = v || null
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No changes' }, { status: 400 })
        }

        updates.updated_at = new Date().toISOString()

        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select(PROFILE_SELECT)
            .single()

        if (error) {
            console.error('[api/user/profile] PATCH', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            profile: {
                ...data,
                email: user.email ?? data.email ?? null,
            },
        })
    } catch (e) {
        console.error('[api/user/profile] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
