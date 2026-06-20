import type { SupabaseClient } from '@supabase/supabase-js'
import {
    boundingBoxDelta,
    haversineDistanceKm,
    resolveProjectCoords,
    type PropertyMapPoint,
} from '@/lib/property-map-coords'
import {
    hasCompleteParsedCoords,
    normalizeStoredMapsShareUrl,
    parseResolvedGoogleMapsUrl,
} from '@/lib/google-maps-parse'

/** 物件詳細の掲載者（エージェント）公開プロフィール */
export type PublicListingOwnerProfile = {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
    phone: string | null
    line_id: string | null
    line_basic_id: string | null
    show_line_in_inquiry: boolean | null
    show_phone_in_inquiry: boolean | null
    show_whatsapp_in_inquiry: boolean | null
    plan: string | null
    plan_type: string | null
    current_period_end: string | null
    is_admin: boolean | null
    email?: string | null
}

const LISTING_OWNER_SELECT_BASE =
    'id, full_name, avatar_url, bio, phone, line_id, line_basic_id, show_line_in_inquiry, show_phone_in_inquiry, plan, plan_type, current_period_end, is_admin, deleted_at, status, user_role'

const LISTING_OWNER_SELECT = `${LISTING_OWNER_SELECT_BASE}, show_whatsapp_in_inquiry`

export async function fetchPublicListingOwnerProfile(
    supabase: SupabaseClient,
    userId: string
): Promise<PublicListingOwnerProfile | null> {
    let { data, error } = await supabase
        .from('profiles')
        .select(LISTING_OWNER_SELECT)
        .eq('id', userId)
        .maybeSingle()

    if (error && /show_whatsapp_in_inquiry/i.test(error.message)) {
        const retry = await supabase
            .from('profiles')
            .select(LISTING_OWNER_SELECT_BASE)
            .eq('id', userId)
            .maybeSingle()
        data = retry.data
        error = retry.error
    }

    if (error || !data) {
        if (error) console.warn('[fetchPublicListingOwnerProfile]', error.message)
        return null
    }

    if (data.deleted_at != null || data.status === 'suspended') {
        return null
    }

    return {
        id: data.id as string,
        full_name: (data.full_name as string | null) ?? null,
        avatar_url: (data.avatar_url as string | null) ?? null,
        bio: (data.bio as string | null) ?? null,
        phone: (data.phone as string | null) ?? null,
        line_id: (data.line_id as string | null) ?? null,
        line_basic_id: (data.line_basic_id as string | null) ?? null,
        show_line_in_inquiry: data.show_line_in_inquiry as boolean | null,
        show_phone_in_inquiry: data.show_phone_in_inquiry as boolean | null,
        show_whatsapp_in_inquiry:
            'show_whatsapp_in_inquiry' in data
                ? (data.show_whatsapp_in_inquiry as boolean | null)
                : true,
        plan: (data.plan as string | null) ?? null,
        plan_type: (data.plan_type as string | null) ?? null,
        current_period_end: (data.current_period_end as string | null) ?? null,
        is_admin: data.is_admin as boolean | null,
    }
}

/** ネスト select 失敗時に area / project を個別取得して補完 */
export async function enrichPropertyWithRelations(
    supabase: SupabaseClient,
    property: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const enriched = { ...property }

    if (!enriched.area && enriched.area_id) {
        const { data: area } = await supabase
            .from('areas')
            .select('name, slug, region:regions(name)')
            .eq('id', enriched.area_id as string)
            .maybeSingle()
        if (area) enriched.area = area
    }

    if (!enriched.project && enriched.project_id) {
        const { data: project } = await supabase
            .from('projects')
            .select('*, developers(name)')
            .eq('id', enriched.project_id as string)
            .maybeSingle()
        if (project) enriched.project = project
    }

    if (!enriched.developers && enriched.developer_id) {
        const { data: dev } = await supabase
            .from('developers')
            .select('name')
            .eq('id', enriched.developer_id as string)
            .maybeSingle()
        if (dev) enriched.developers = dev
    }

    return enriched
}

const PROPERTY_CARD_SELECT = `
    *,
    area:areas(name, region:regions(name)),
    project:projects(*)
`

export async function fetchRelatedPropertiesForDetail(
    supabase: SupabaseClient,
    currentPropertyId: string,
    buildingName: string | null | undefined,
    projectName: string | null | undefined
) {
    if (!buildingName && !projectName) return []

    let query = supabase
        .from('properties')
        .select(PROPERTY_CARD_SELECT)
        .neq('id', currentPropertyId)
        .eq('status', 'published')
        .eq('is_approved', true)
        .limit(6)

    const filters: string[] = []
    if (buildingName) filters.push(`building_name.eq."${buildingName.replace(/"/g, '\\"')}"`)
    if (projectName) filters.push(`project_name.eq."${projectName.replace(/"/g, '\\"')}"`)
    if (filters.length === 0) return []

    query = query.or(filters.join(',')).order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) {
        console.warn('[fetchRelatedPropertiesForDetail]', error.message)
        return []
    }
    return data ?? []
}

const NEARBY_MAP_RADIUS_KM = 2
const NEARBY_MAP_LIMIT = 24

export async function fetchNearbyPropertiesForMap(
    supabase: SupabaseClient,
    currentPropertyId: string,
    centerLat: number,
    centerLng: number,
    radiusKm = NEARBY_MAP_RADIUS_KM,
    limit = NEARBY_MAP_LIMIT
): Promise<PropertyMapPoint[]> {
    const { deltaLat, deltaLng } = boundingBoxDelta(radiusKm, centerLat)
    const minLat = centerLat - deltaLat
    const maxLat = centerLat + deltaLat
    const minLng = centerLng - deltaLng
    const maxLng = centerLng + deltaLng

    const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, latitude, longitude, google_maps_share_url')
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

    if (projectError) {
        console.warn('[fetchNearbyPropertiesForMap] projects', projectError.message)
        return []
    }

    const projectCoords = new Map<string, { lat: number; lng: number }>()
    for (const row of projects ?? []) {
        let coords = resolveProjectCoords(row)
        if (!coords) {
            const share = normalizeStoredMapsShareUrl(
                typeof row.google_maps_share_url === 'string' ? row.google_maps_share_url : null
            )
            if (share) {
                const parsed = parseResolvedGoogleMapsUrl(share)
                if (hasCompleteParsedCoords(parsed)) {
                    coords = { lat: parsed.latitude!, lng: parsed.longitude! }
                }
            }
        }
        if (!coords) continue
        if (haversineDistanceKm(centerLat, centerLng, coords.lat, coords.lng) > radiusKm) continue
        projectCoords.set(row.id as string, coords)
    }

    const projectIds = [...projectCoords.keys()]
    if (projectIds.length === 0) return []

    const { data: properties, error } = await supabase
        .from('properties')
        .select(
            'id, title, title_en, title_th, building_name, project_id, project:projects(latitude, longitude)'
        )
        .in('project_id', projectIds)
        .eq('status', 'published')
        .eq('is_approved', true)
        .neq('id', currentPropertyId)
        .limit(limit * 3)

    if (error) {
        console.warn('[fetchNearbyPropertiesForMap] properties', error.message)
        return []
    }

    const points: PropertyMapPoint[] = []
    for (const row of properties ?? []) {
        const projectId = row.project_id as string | null
        const coords = projectId ? projectCoords.get(projectId) : null
        if (!coords) continue
        points.push({
            id: row.id as string,
            lat: coords.lat,
            lng: coords.lng,
            title: (row.title as string | null) || (row.building_name as string | null) || 'Property',
            title_en: row.title_en as string | null,
            title_th: row.title_th as string | null,
            title_ja: row.title as string | null,
            building_name: row.building_name as string | null,
        })
    }

    return points
        .sort(
            (a, b) =>
                haversineDistanceKm(centerLat, centerLng, a.lat, a.lng) -
                haversineDistanceKm(centerLat, centerLng, b.lat, b.lng)
        )
        .slice(0, limit)
}

export async function fetchAgentOtherPropertiesForDetail(
    supabase: SupabaseClient,
    agentId: string,
    currentPropertyId: string
) {
    const { data, error } = await supabase
        .from('properties')
        .select(PROPERTY_CARD_SELECT)
        .eq('user_id', agentId)
        .eq('status', 'published')
        .eq('is_approved', true)
        .neq('id', currentPropertyId)
        .order('updated_at', { ascending: false })
        .limit(8)

    if (error) {
        console.warn('[fetchAgentOtherPropertiesForDetail]', error.message)
        return []
    }
    return data ?? []
}

export async function fetchAgentPublishedProperties(
    supabase: SupabaseClient,
    agentId: string,
    limit = 4
) {
    const { data, error } = await supabase
        .from('properties')
        .select(PROPERTY_CARD_SELECT)
        .eq('user_id', agentId)
        .eq('status', 'published')
        .eq('is_approved', true)
        .order('updated_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.warn('[fetchAgentPublishedProperties]', error.message)
        return []
    }
    return data ?? []
}

export async function countAgentPublishedProperties(
    supabase: SupabaseClient,
    agentId: string
): Promise<number> {
    const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', agentId)
        .eq('status', 'published')
        .eq('is_approved', true)

    if (error) {
        console.warn('[countAgentPublishedProperties]', error.message)
        return 0
    }
    return count ?? 0
}
