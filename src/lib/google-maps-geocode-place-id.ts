import { isLikelyGooglePlaceId } from '@/lib/google-maps-parse'

type GeoLocation = {
  lat?: number
  lng?: number
}

function readLatLng(location: GeoLocation | undefined): { lat: number; lng: number } | null {
  const lat = location?.lat
  const lng = location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Google Place ID から Geocoding API で座標を取得（API キー未設定時は null）。
 */
export async function geocodePlaceIdToLatLng(
  placeId: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = placeId.trim()
  if (!isLikelyGooglePlaceId(trimmed)) return null

  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) return null

  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('place_id', trimmed)
  u.searchParams.set('key', key)

  try {
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(10000) })
    const data = (await res.json()) as {
      status?: string
      results?: Array<{ geometry?: { location?: GeoLocation } }>
    }
    if (data.status !== 'OK' || !data.results?.length) return null
    return readLatLng(data.results[0]?.geometry?.location)
  } catch {
    return null
  }
}
