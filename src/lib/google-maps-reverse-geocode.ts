import { isLikelyGooglePlaceId } from '@/lib/google-maps-parse'

type GeoResult = {
  place_id?: string
  types?: string[]
}

function pickPlaceIdFromResults(results: GeoResult[]): string | null {
  const priority = [
    'lodging',
    'establishment',
    'point_of_interest',
    'tourist_attraction',
    'premise',
    'subpremise',
    'street_address',
    'route',
  ] as const
  for (const t of priority) {
    const hit = results.find((r) => r.types?.includes(t))
    const pid = hit?.place_id
    if (typeof pid === 'string' && isLikelyGooglePlaceId(pid)) return pid.trim()
  }
  const first = results[0]?.place_id
  return typeof first === 'string' && isLikelyGooglePlaceId(first) ? first.trim() : null
}

/**
 * 緯度経度から Geocoding API で place_id を取得（API キーが無ければ null）。
 * 注意: キーに「HTTP リファラー」制限があるとサーバーからの呼び出しは REQUEST_DENIED になりがち。
 * その場合はブラウザ Geocoder（browserReverseGeocodeToPlaceId）に任せる。
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
      error_message?: string
      results?: GeoResult[]
    }
    if (data.status !== 'OK' || !data.results?.length) {
      if (process.env.NODE_ENV === 'development' && data.status && data.status !== 'ZERO_RESULTS') {
        console.warn('[reverseGeocodeToPlaceId]', data.status, data.error_message || '')
      }
      return null
    }
    return pickPlaceIdFromResults(data.results)
  } catch {
    return null
  }
}
