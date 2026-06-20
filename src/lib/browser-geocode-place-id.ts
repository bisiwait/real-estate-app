import { isLikelyGooglePlaceId } from '@/lib/google-maps-parse'

function pickPlaceIdFromGeocoderResults(results: google.maps.GeocoderResult[]): string | null {
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
    if (pid && isLikelyGooglePlaceId(pid)) return pid.trim()
  }
  const first = results[0]?.place_id
  return first && isLikelyGooglePlaceId(first) ? first.trim() : null
}

import { ensureGoogleMapsScript } from '@/lib/google-maps-browser-loader'

/**
 * Maps JavaScript API を読み込み（未読込時のみ）。ブラウザの Geocoder はリファラー制限付きキーでも動きやすい。
 */
export function ensureGoogleMapsForGeocode(): Promise<void> {
  return ensureGoogleMapsScript('jp')
}

/**
 * 緯度経度からブラウザの Geocoder で place_id を取得。
 */
export async function browserReverseGeocodeToPlaceId(lat: number, lng: number): Promise<string | null> {
  await ensureGoogleMapsForGeocode()
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        resolve(null)
        return
      }
      resolve(pickPlaceIdFromGeocoderResults(results))
    })
  })
}
