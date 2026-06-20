import { Loader } from '@googlemaps/js-api-loader'
import { resolveGoogleMapsLocale } from '@/lib/google-maps-locale'

const loaders = new Map<string, Loader>()

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim())
}

/**
 * Maps JavaScript API を locale に合わせた言語で読み込む。
 */
export async function ensureGoogleMapsScript(locale = 'jp'): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('SSR')
  }

  if (window.google?.maps?.Map) {
    return
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です')
  }

  const { language, region } = resolveGoogleMapsLocale(locale)
  const cacheKey = `${language}:${region ?? ''}`

  let loader = loaders.get(cacheKey)
  if (!loader) {
    loader = new Loader({
      apiKey: key,
      version: 'weekly',
      language,
      ...(region ? { region } : {}),
    })
    loaders.set(cacheKey, loader)
  }

  await loader.load()
}
