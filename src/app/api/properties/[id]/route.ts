import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { assertAgentOwnsProperty } from '@/lib/supabase/assert-agent-property-access'
import { revalidatePropertyListPages } from '@/lib/services/revalidatePropertyList'
import { requireAgentApiSession } from '@/lib/agent/require-agent-api-session'
import {
    checkPropertySaveDuplicatesAdmin,
    pickPropertySaveFields,
} from '@/lib/properties/agent-save-property'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: propertyId } = await context.params
        const auth = await requireAgentApiSession()
        if ('error' in auth) return auth.error

        const owned = await assertAgentOwnsProperty(auth.session.user.id, propertyId)
        if (owned.error) {
            return NextResponse.json({ error: owned.error }, { status: owned.status })
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

        const title = typeof body.title === 'string' ? body.title.trim() : ''
        if (title) {
            const dup = await checkPropertySaveDuplicatesAdmin(auth.session.admin, {
                title,
                excludePropertyId: propertyId,
                description: typeof body.description === 'string' ? body.description : null,
                checkDescriptionPrefix: body.checkDescriptionPrefix === true,
            })
            if (!dup.ok) {
                return NextResponse.json({ error: dup.message }, { status: 400 })
            }
        }

        const row = pickPropertySaveFields(body)
        if (auth.session.isAdmin && 'is_approved' in body) {
            row.is_approved = body.is_approved === true
        } else if ('is_approved' in row) {
            delete row.is_approved
        }

        row.updated_at = new Date().toISOString()

        const admin = await createAdminClient()
        const { data, error } = await admin
            .from('properties')
            .update(row)
            .eq('id', propertyId)
            .eq('user_id', auth.session.user.id)
            .select('id')
            .maybeSingle()

        if (error) {
            console.error('[api/properties/[id]] PATCH', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        if (!data) {
            return NextResponse.json({ error: 'Update failed' }, { status: 404 })
        }

        const projectSync = body.projectSync as Record<string, unknown> | undefined
        if (auth.session.isAdmin && projectSync) {
            const projectId =
                typeof projectSync.projectId === 'string' ? projectSync.projectId.trim() : ''
            if (projectId) {
                const projectUpdate: Record<string, unknown> = {}
                for (const key of [
                    'property_type',
                    'year_built',
                    'total_floors',
                    'total_units',
                    'developer',
                    'google_place_id',
                    'google_maps_share_url',
                    'latitude',
                    'longitude',
                ] as const) {
                    if (key in projectSync) projectUpdate[key] = projectSync[key]
                }
                projectUpdate.updated_at = new Date().toISOString()
                const { error: projectSyncError } = await admin
                    .from('projects')
                    .update(projectUpdate)
                    .eq('id', projectId)

                if (projectSyncError) {
                    console.warn('[api/properties/[id]] projectSync', projectSyncError)
                }
            }
        }

        revalidatePropertyListPages()
        return NextResponse.json({ property: data })
    } catch (e) {
        console.error('[api/properties/[id]] PATCH unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: propertyId } = await context.params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const owned = await assertAgentOwnsProperty(user.id, propertyId)
        if (owned.error) {
            return NextResponse.json({ error: owned.error }, { status: owned.status })
        }

        const admin = await createAdminClient()
        const { data: deleted, error: deleteError } = await admin
            .from('properties')
            .delete()
            .eq('id', propertyId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle()

        if (deleteError) {
            console.error('[api/properties/[id]] DELETE', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }
        if (!deleted) {
            return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
        }

        revalidatePropertyListPages()

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('[api/properties/[id]] DELETE unexpected', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
