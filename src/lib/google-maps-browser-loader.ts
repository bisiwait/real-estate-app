export type GoogleMapsLocaleConfig = {
  language: string
  region?: string
}

export function resolveGoogleMapsLocale(locale: string): GoogleMapsLocaleConfig {
  if (locale === 'jp') return { language: 'ja', region: 'JP' }
  if (locale === 'th') return { language: 'th', region: 'TH' }
  return { language: 'en', region: 'US' }
}

const loadPromises = new Map<string, Promise<void>>()

/**
 * Maps JavaScript API を locale に合わせた言語で読み込む（同一 language/region は1回のみ）。
 */
export function ensureGoogleMapsScript(locale = 'jp'): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SSR'))
  }

  const { language, region } = resolveGoogleMapsLocale(locale)
  const cacheKey = `${language}:${region ?? ''}`

  if (window.google?.maps?.Map) {
    return Promise.resolve()
  }

  const existing = loadPromises.get(cacheKey)
  if (existing) return existing

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です'))
  }

  const promise = new Promise<void>((resolve, reject) => {
    const scriptSelector = 'script[src*="maps.googleapis.com/maps/api/js"]'
    const prior = document.querySelector<HTMLScriptElement>(scriptSelector)
    if (prior) {
      const done = () => {
        if (window.google?.maps?.Map) resolve()
        else reject(new Error('Google Maps の読み込みを待てませんでした'))
      }
      if (window.google?.maps?.Map) {
        resolve()
        return
      }
      prior.addEventListener('load', done, { once: true })
      prior.addEventListener('error', () => reject(new Error('Maps スクリプトエラー')), { once: true })
      return
    }

    const cbName = `__gmaps_loader_cb_${Date.now()}`
    ;(window as unknown as Record<string, () => void>)[cbName] = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      resolve()
    }

    const params = new URLSearchParams({
      key,
      callback: cbName,
      language,
    })
    if (region) params.set('region', region)

    const script = document.createElement('script')
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cbName]
      loadPromises.delete(cacheKey)
      reject(new Error('Maps API スクリプトの読み込みに失敗しました'))
    }
    document.head.appendChild(script)
  }).catch((error) => {
    loadPromises.delete(cacheKey)
    throw error
  })

  loadPromises.set(cacheKey, promise)
  return promise
}
