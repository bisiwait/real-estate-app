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

let loadPromise: Promise<void> | null = null

/**
 * Maps JavaScript API を読み込み（未読込時のみ）。ブラウザの Geocoder はリファラー制限付きキーでも動きやすい。
 */
export function ensureGoogleMapsForGeocode(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'))
  }
  if (window.google?.maps?.Geocoder) {
    return Promise.resolve()
  }
  if (loadPromise) return loadPromise

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    )
    if (existing) {
      const done = () => {
        if (window.google?.maps?.Geocoder) resolve()
        else reject(new Error('Google Maps の読み込みを待てませんでした'))
      }
      if (window.google?.maps?.Geocoder) {
        resolve()
        return
      }
      existing.addEventListener('load', done, { once: true })
      existing.addEventListener('error', () => reject(new Error('Maps スクリプトエラー')), {
        once: true,
      })
      return
    }

    const cbName = `__gmaps_geocode_cb_${Date.now()}`
    ;(window as unknown as Record<string, () => void>)[cbName] = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      resolve()
    }

    const s = document.createElement('script')
    s.async = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cbName}`
    s.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      loadPromise = null
      reject(new Error('Maps API スクリプトの読み込みに失敗しました'))
    }
    document.head.appendChild(s)
  })

  return loadPromise.catch((e) => {
    loadPromise = null
    throw e
  })
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
