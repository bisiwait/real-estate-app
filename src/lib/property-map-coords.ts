import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG, finiteCoord, normalizeLatLngForThailand } from '@/lib/google-maps-url'
import {
  hasCompleteParsedCoords,
  normalizeStoredGooglePlaceId,
  normalizeStoredMapsShareUrl,
  parseResolvedGoogleMapsUrl,
} from '@/lib/google-maps-parse'
import { geocodePlaceIdToLatLng } from '@/lib/google-maps-geocode-place-id'

export type ProjectCoordFields = {
  latitude?: unknown
  longitude?: unknown
  google_maps_share_url?: unknown
  google_place_id?: unknown
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
  project_name?: string | null
  project_name_jp?: string | null
}

const EARTH_RADIUS_KM = 6371

export function resolveProjectCoords(project: ProjectCoordFields): { lat: number; lng: number } | null {
  if (!project) return null

  const share = normalizeStoredMapsShareUrl(
    typeof project.google_maps_share_url === 'string' ? project.google_maps_share_url : null
  )
  if (share) {
    const parsed = parseResolvedGoogleMapsUrl(share)
    if (hasCompleteParsedCoords(parsed)) {
      return normalizeLatLngForThailand(parsed.latitude!, parsed.longitude!)
    }
  }

  const hasPlaceId = Boolean(
    normalizeStoredGooglePlaceId(
      typeof project.google_place_id === 'string' ? project.google_place_id : null
    )
  )

  const rawLat = finiteCoord(project.latitude, NaN)
  const rawLng = finiteCoord(project.longitude, NaN)
  if (Number.isFinite(rawLat) && Number.isFinite(rawLng)) {
    const isDefault = rawLat === DEFAULT_MAP_LAT && rawLng === DEFAULT_MAP_LNG
    if (!isDefault || !hasPlaceId) {
      return normalizeLatLngForThailand(rawLat, rawLng)
    }
  }

  return null
}

export async function resolveProjectCoordsAsync(
  project: ProjectCoordFields
): Promise<{ lat: number; lng: number } | null> {
  const sync = resolveProjectCoords(project)
  if (sync) return sync

  const placeId = normalizeStoredGooglePlaceId(
    typeof project?.google_place_id === 'string' ? project.google_place_id : null
  )
  if (!placeId) return null

  const geocoded = await geocodePlaceIdToLatLng(placeId)
  if (geocoded) return normalizeLatLngForThailand(geocoded.lat, geocoded.lng)

  return null
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

export function resolvePropertyMapProjectName(
  point: Pick<
    PropertyMapPoint,
    'project_name' | 'project_name_jp' | 'building_name' | 'title'
  >,
  locale: string
): string {
  const name = point.project_name?.trim() || point.building_name?.trim() || ''
  const nameJp = point.project_name_jp?.trim() || ''

  if (locale === 'jp' && name && nameJp) return `${name} (${nameJp})`
  if (locale === 'jp' && nameJp) return nameJp

  return name || nameJp || point.title?.trim() || 'Property'
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
  locale: string,
  coords?: { lat: number; lng: number } | null
): PropertyMapPoint | null {
  const resolved = coords ?? resolveProjectCoords(property.project as ProjectCoordFields)
  if (!resolved) return null
  const project = property.project as { name?: string; name_jp?: string } | null | undefined
  return {
    id: String(property.id),
    lat: resolved.lat,
    lng: resolved.lng,
    title: resolvePropertyMapTitle(
      property as Pick<PropertyMapPoint, 'title' | 'title_en' | 'title_th' | 'title_ja' | 'building_name'>,
      locale
    ),
    title_en: property.title_en as string | null | undefined,
    title_th: property.title_th as string | null | undefined,
    title_ja: property.title_ja as string | null | undefined,
    building_name: property.building_name as string | null | undefined,
    project_name: project?.name ?? (property.building_name as string | null | undefined) ?? null,
    project_name_jp: project?.name_jp ?? null,
  }
}

export function fallbackMapCenter(): { lat: number; lng: number } {
  return { lat: DEFAULT_MAP_LAT, lng: DEFAULT_MAP_LNG }
}
