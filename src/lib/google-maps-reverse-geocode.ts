import { isLikelyGooglePlaceId } from '@/lib/google-maps-parse'

/**
 * 緯度経度から Geocoding API で place_id を取得（API キーが無ければ null）。
 */
export async function reverseGeocodeToPlaceId(
  lat: number,
  lng: number
): Promise<string | null> {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('latlng', `${lat},${lng}`)
  u.searchParams.set('key', key)

  try {
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(10000) })
    const data = (await res.json()) as {
      status?: string
      results?: Array<{ place_id?: string }>
    }
    if (data.status !== 'OK' || !data.results?.length) return null
    const pid = data.results[0].place_id
    if (typeof pid === 'string' && isLikelyGooglePlaceId(pid)) return pid.trim()
    return null
  } catch {
    return null
  }
}
