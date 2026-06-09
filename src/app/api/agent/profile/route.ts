import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidateAgentPublicPages } from '@/lib/services/revalidateAgentPages'

const AGENT_PROFILE_SELECT_BASE =
    'full_name, company_name, phone, bio, website, avatar_url, plan, plan_type, current_period_end, auto_renew, is_admin, user_role, show_phone_in_inquiry, show_line_in_inquiry, line_basic_id, line_id'

const AGENT_PROFILE_SELECT = `${AGENT_PROFILE_SELECT_BASE}, show_whatsapp_in_inquiry`

async function loadAgentProfile(admin: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
    let result = await admin
        .from('profiles')
        .select(`id, ${AGENT_PROFILE_SELECT}`)
        .eq('id', userId)
        .maybeSingle()

    if (result.error && /show_whatsapp_in_inquiry/i.test(result.error.message)) {
        result = await admin
            .from('profiles')
            .select(`id, ${AGENT_PROFILE_SELECT_BASE}`)
            .eq('id', userId)
            .maybeSingle()
        if (result.data && !('show_whatsapp_in_inquiry' in result.data)) {
            result.data = { ...result.data, show_whatsapp_in_inquiry: true }
        }
    }

    return result
}

type AgentProfileRow = {
    user_role?: string | null
    is_admin?: boolean | null
}

function isAgentProfile(profile: AgentProfileRow) {
    return (
        profile.is_admin === true ||
        profile.user_role === 'admin' ||
        profile.user_role === 'agent'
    )
}

async function requireAgentSession() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const admin = await createAdminClient()
    const { data: profile, error } = await loadAgentProfile(admin, user.id)

    if (error) {
        console.error('[api/agent/profile] load', error)
        return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
    }
    if (!profile) {
        return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) }
    }
    if (!isAgentProfile(profile)) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }

    return { user, profile, admin }
}

const PUBLIC_VISIBILITY_FIELDS = [
    'show_phone_in_inquiry',
    'show_line_in_inquiry',
    'show_whatsapp_in_inquiry',
    'phone',
    'line_basic_id',
    'line_id',
] as const

function touchesPublicInquirySettings(updates: Record<string, unknown>) {
    return PUBLIC_VISIBILITY_FIELDS.some((key) => key in updates)
}

/** エージェント向けプロフィール（RLS 回避） */
export async function GET() {
    try {
        const session = await requireAgentSession()
        if ('error' in session && session.error) return session.error

        const { user, profile } = session
        return NextResponse.json({
            profile: {
                ...profile,
                email: user!.email ?? null,
            },
        })
    } catch (e) {
        console.error('[api/agent/profile] GET unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await requireAgentSession()
        if ('error' in session && session.error) return session.error

        const { user, admin } = session

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

        const updates: Record<string, string | boolean | null> = {}

        if (body.full_name !== undefined) {
            const v = typeof body.full_name === 'string' ? body.full_name.trim() : ''
            updates.full_name = v || null
        }
        if (body.company_name !== undefined) {
            const v = typeof body.company_name === 'string' ? body.company_name.trim() : ''
            updates.company_name = v || null
        }
        if (body.phone !== undefined) {
            const v = typeof body.phone === 'string' ? body.phone.trim() : ''
            updates.phone = v || null
        }
        if (body.bio !== undefined) {
            const v = typeof body.bio === 'string' ? body.bio.trim() : ''
            updates.bio = v || null
        }
        if (body.website !== undefined) {
            const v = typeof body.website === 'string' ? body.website.trim() : ''
            updates.website = v || null
        }
        if (body.avatar_url !== undefined) {
            const v = typeof body.avatar_url === 'string' ? body.avatar_url.trim() : ''
            updates.avatar_url = v || null
        }
        if (body.auto_renew !== undefined) {
            updates.auto_renew = body.auto_renew === true
        }
        if (body.show_phone_in_inquiry !== undefined) {
            updates.show_phone_in_inquiry = body.show_phone_in_inquiry === true
        }
        if (body.show_line_in_inquiry !== undefined) {
            updates.show_line_in_inquiry = body.show_line_in_inquiry === true
        }
        if (body.show_whatsapp_in_inquiry !== undefined) {
            updates.show_whatsapp_in_inquiry = body.show_whatsapp_in_inquiry === true
        }
        if (body.line_basic_id !== undefined) {
            const v = typeof body.line_basic_id === 'string' ? body.line_basic_id.trim() : ''
            updates.line_basic_id = v || null
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No changes' }, { status: 400 })
        }

        updates.updated_at = new Date().toISOString()

        let { data, error } = await admin!
            .from('profiles')
            .update(updates)
            .eq('id', user!.id)
            .select(AGENT_PROFILE_SELECT)
            .single()

        if (error && /show_whatsapp_in_inquiry/i.test(error.message) && 'show_whatsapp_in_inquiry' in updates) {
            const { show_whatsapp_in_inquiry: _drop, ...rest } = updates
            ;({ data, error } = await admin!
                .from('profiles')
                .update(rest)
                .eq('id', user!.id)
                .select(AGENT_PROFILE_SELECT_BASE)
                .single())
            if (data && !('show_whatsapp_in_inquiry' in data)) {
                data = { ...data, show_whatsapp_in_inquiry: true }
            }
        }

        if (error) {
            console.error('[api/agent/profile] PATCH', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (touchesPublicInquirySettings(updates)) {
            try {
                await revalidateAgentPublicPages(admin!, user!.id)
            } catch (revalidateErr) {
                console.warn('[api/agent/profile] revalidate failed', revalidateErr)
            }
        }

        return NextResponse.json({
            profile: {
                ...data,
                email: user!.email ?? null,
            },
        })
    } catch (e) {
        console.error('[api/agent/profile] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
