import { createAdminClient } from '@/lib/supabase/server'

export async function assertAgentOwnsProperties(userId: string, propertyIds: string[]) {
    const uniqueIds = [...new Set(propertyIds.filter(Boolean))]
    if (uniqueIds.length === 0) {
        return { error: 'No property ids', status: 400 as const, ids: [] as string[] }
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
        .from('properties')
        .select('id, user_id')
        .in('id', uniqueIds)

    if (error) {
        return { error: error.message, status: 500 as const, ids: [] as string[] }
    }

    const rows = data ?? []
    if (rows.length !== uniqueIds.length) {
        return { error: 'Property not found', status: 404 as const, ids: [] as string[] }
    }

    if (rows.some((row) => row.user_id !== userId)) {
        return { error: 'Forbidden', status: 403 as const, ids: [] as string[] }
    }

    return { error: null, status: 200 as const, ids: uniqueIds }
}

export async function assertAgentOwnsProperty(userId: string, propertyId: string) {
    const result = await assertAgentOwnsProperties(userId, [propertyId])
    if (result.error) {
        return { error: result.error, status: result.status, property: null }
    }
    return { error: null, status: 200 as const, property: { id: propertyId } }
}
