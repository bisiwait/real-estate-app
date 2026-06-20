import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG, finiteCoord, normalizeLatLngForThailand } from '@/lib/google-maps-url'

export type ProjectCoordFields = {
    latitude?: unknown
    longitude?: unknown
} | null | undefined

export type PropertyMapPoint = {
    id: string
    lat: number
    lng: number
    title: string
    title_en?: string | null
    title_th?: string | null
    title_ja?: string | null
    building_name?: string | null
}

const EARTH_RADIUS_KM = 6371

export function resolveProjectCoords(project: ProjectCoordFields): { lat: number; lng: number } | null {
    if (!project) return null
    const rawLat = finiteCoord(project.latitude, NaN)
    const rawLng = finiteCoord(project.longitude, NaN)
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return null
    if (rawLat === DEFAULT_MAP_LAT && rawLng === DEFAULT_MAP_LNG) return null
    return normalizeLatLngForThailand(rawLat, rawLng)
}

export function haversineDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function boundingBoxDelta(radiusKm: number, centerLat: number) {
    const deltaLat = radiusKm / 111
    const cosLat = Math.cos((centerLat * Math.PI) / 180)
    const deltaLng = radiusKm / (111 * Math.max(cosLat, 0.01))
    return { deltaLat, deltaLng }
}

export function resolvePropertyMapTitle(
    property: Pick<PropertyMapPoint, 'title' | 'title_en' | 'title_th' | 'title_ja' | 'building_name'>,
    locale: string
): string {
    if (locale === 'en' && property.title_en?.trim()) return property.title_en.trim()
    if (locale === 'th' && property.title_th?.trim()) return property.title_th.trim()
    return (
        property.title_ja?.trim() ||
        property.title?.trim() ||
        property.building_name?.trim() ||
        'Property'
    )
}

export function toPropertyMapPoint(
    property: Record<string, unknown>,
    locale: string
): PropertyMapPoint | null {
    const project = property.project as ProjectCoordFields
    const coords = resolveProjectCoords(project)
    if (!coords) return null
    return {
        id: String(property.id),
        lat: coords.lat,
        lng: coords.lng,
        title: resolvePropertyMapTitle(
            property as Pick<PropertyMapPoint, 'title' | 'title_en' | 'title_th' | 'title_ja' | 'building_name'>,
            locale
        ),
        title_en: property.title_en as string | null | undefined,
        title_th: property.title_th as string | null | undefined,
        title_ja: property.title_ja as string | null | undefined,
        building_name: property.building_name as string | null | undefined,
    }
}
